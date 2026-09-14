"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useSystem, type AgentPhase } from "@/lib/state";
import type { PlacedNode } from "@/lib/map-layout";

/* THE SYSTEM MAP.

   Not a backdrop: the map is the site's information architecture, drawn.
   Every node is a real document from the content engine — the case studies
   orbit the subsystems they actually run on (the `uses` edges in their
   frontmatter), and the agent sits at the core. Drop a new .mdx file in
   and a new node appears with its edges; nothing here is hand-placed.

   It is also the agent's activity made visible. When the agent searches,
   the SSE stream carries the slugs it found, and those exact nodes flare
   with beams from the core: the visitor watches the system read its own
   map. Selection moves the camera; entering a node navigates the site.

   The DOM label layer (owned by MapStage) is the accessible half — real
   links, keyboard focusable. This canvas gives them body and relationship. */

/* ── palette (matches the CSS custom properties) ───────────────────────── */

const IRIS = new THREE.Color("#5578c8");
const IRIS_BRIGHT = new THREE.Color("#8fa9f2");
const IRIS_DEEP = new THREE.Color("#2c4380");
const AMBER = new THREE.Color("#c9a35e");
const AMBER_BRIGHT = new THREE.Color("#e4c77f");
const INK = new THREE.Color("#eae7de");
/* the two wiring materials: core→system spokes and work→system
   dependencies — identical on the incumbent palette, split so a material
   system can treat intelligence-wiring and production-wiring differently */
const EDGE_SYS = new THREE.Color("#2c4380");
const EDGE_WORK = new THREE.Color("#8a6f38");

/* ── per-phase energy for the core, same table the console speaks ──────── */

const CORE_ENERGY: Record<AgentPhase, number> = {
  idle: 0.16, listening: 0.5, thinking: 0.66, tool: 0.78, speaking: 0.55, ended: 0.08,
};

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

/* Layout comes from lib/map.ts as plain tuples (so the main bundle never
   imports three); here they become vectors. */

export type Placed = Omit<PlacedNode, "pos"> & { pos: THREE.Vector3 };

export function toPlaced(nodes: PlacedNode[]): Placed[] {
  return nodes.map((n) => ({ ...n, pos: new THREE.Vector3(...n.pos) }));
}

/* ── one node's live handles ───────────────────────────────────────────── */

type Handles = {
  group: THREE.Group;
  glow: THREE.SpriteMaterial;
  wire: THREE.LineBasicMaterial;
  dot: THREE.MeshBasicMaterial;
};

function glowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(143,169,242,0.95)");
  g.addColorStop(0.4, "rgba(85,120,200,0.30)");
  g.addColorStop(1, "rgba(85,120,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── the graph ─────────────────────────────────────────────────────────── */

function Graph({
  placed,
  labels,
  onEnter,
  onEngage,
  compact,
}: {
  placed: Placed[];
  labels: React.MutableRefObject<Map<string, HTMLElement>>;
  onEnter: (node: Placed) => void;
  onEngage: () => void;
  compact: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const handles = useRef(new Map<string, Handles>());
  const ring = useRef<THREE.Mesh>(null!);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null!);
  const baseEdges = useRef<THREE.LineBasicMaterial>(null!);
  const { camera, gl, size } = useThree();

  const tex = useMemo(glowTexture, []);
  const byatSlug = useMemo(() => new Map(placed.map((p) => [p.slug, p])), [placed]);

  /* orbit state: drag rotates the map, wheel/pinch zooms the camera */
  const orbit = useRef({ ry: 0, rx: -0.12, tRy: 0, tRx: -0.12, radius: 0, tRadius: 0 });

  /* Frame the map for the screen it is actually on: portrait phones need
     the camera further back or the outer ring crops at both edges. Runs
     again on every resize/rotation, so the framing follows the viewport. */
  useEffect(() => {
    const o = orbit.current;
    const aspect = size.width / Math.max(size.height, 1);
    const base = compact ? 11.9 : 9.6;
    const fit = clamp(base * (aspect < 1 ? 0.78 / aspect : 1), base, 19);
    const first = o.radius === 0;
    o.tRadius = fit;
    if (first) o.radius = fit;
  }, [compact, size.width, size.height]);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let px = 0, py = 0;
    let pinch = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      px = e.clientX; py = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const o = orbit.current;
      o.tRy += (e.clientX - px) * 0.005;
      // trackball direction: dragging up rolls the map up (top tilts away)
      o.tRx = clamp(o.tRx - (e.clientY - py) * 0.0032, -0.55, 0.4);
      px = e.clientX; py = e.clientY;
    };
    const up = () => { dragging = false; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const o = orbit.current;
      o.tRadius = clamp(o.tRadius + e.deltaY * 0.004, 3.5, 19.5);
    };
    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const o = orbit.current;
        o.tRadius = clamp(o.tRadius - (d - pinch) * 0.02, 3.5, 19.5);
        pinch = d;
      }
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchmove", touchMove, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
    };
  }, [gl]);

  /* the permanent wiring, as two materials: core→system spokes and
     work→system dependencies */
  const sysEdgeGeo = useMemo(() => {
    const pts: number[] = [];
    for (const p of placed) {
      if (p.kind === "system") pts.push(0, 0.1, 0, p.pos.x, p.pos.y, p.pos.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [placed]);
  const workEdgeGeo = useMemo(() => {
    const pts: number[] = [];
    for (const p of placed) {
      if (p.kind === "work") {
        for (const u of p.uses) {
          const s = byatSlug.get(u);
          if (s) pts.push(s.pos.x, s.pos.y, s.pos.z, p.pos.x, p.pos.y, p.pos.z);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [placed, byatSlug]);
  const workEdges = useRef<THREE.LineBasicMaterial>(null!);

  /* the lit wiring: edges incident to the focused/selected node, plus
     agent beams from the core to whatever it just read */
  const focusSlug = useSystem((s) => s.focusSlug);
  const selectedSlug = useSystem((s) => s.selectedSlug);
  const flare = useSystem((s) => s.flare);

  const litEdgeGeo = useMemo(() => {
    const pts: number[] = [];
    const lit = new Set([focusSlug, selectedSlug].filter(Boolean) as string[]);
    for (const p of placed) {
      if (p.kind === "work" && lit.has(p.slug)) {
        for (const u of p.uses) {
          const s = byatSlug.get(u);
          if (s) pts.push(s.pos.x, s.pos.y, s.pos.z, p.pos.x, p.pos.y, p.pos.z);
        }
      }
      if (p.kind === "system" && lit.has(p.slug)) {
        pts.push(0, 0.1, 0, p.pos.x, p.pos.y, p.pos.z);
        for (const w of placed) {
          if (w.kind === "work" && w.uses.includes(p.slug)) {
            pts.push(p.pos.x, p.pos.y, p.pos.z, w.pos.x, w.pos.y, w.pos.z);
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [placed, byatSlug, focusSlug, selectedSlug]);

  /* the agent's beams: core → every document it just read, fading out on
     their own clock in the frame loop */
  const beamGeo = useMemo(() => {
    const pts: number[] = [];
    for (const slug of flare.slugs) {
      const p = byatSlug.get(slug);
      if (p) pts.push(0, 0.1, 0, p.pos.x, p.pos.y, p.pos.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [byatSlug, flare]);
  const beamMat = useRef<THREE.LineBasicMaterial>(null!);

  /* dust: a sparse still field, far behind */
  const dust = useMemo(() => {
    const n = compact ? 140 : 320;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 7 + Math.random() * 9;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 7;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [compact]);

  const register = (slug: string) => (g: THREE.Group | null) => {
    if (!g) { handles.current.delete(slug); return; }
    const glow = (g.getObjectByName("glow") as THREE.Sprite)?.material as THREE.SpriteMaterial;
    const wire = (g.getObjectByName("wire") as THREE.LineSegments)?.material as THREE.LineBasicMaterial;
    const dot = ((g.getObjectByName("dot") as THREE.Mesh)?.material ?? null) as THREE.MeshBasicMaterial;
    handles.current.set(slug, { group: g, glow, wire, dot });
  };

  const v = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sys = useSystem.getState();
    const o = orbit.current;

    // idle drift plus the visitor's orbit, both damped
    o.tRy += delta * 0.028;
    o.ry = damp(o.ry, o.tRy, 4, delta);
    o.rx = damp(o.rx, o.tRx, 4, delta);
    o.radius = damp(o.radius, o.tRadius, 3, delta);
    root.current.rotation.set(o.rx, o.ry, 0, "YXZ");

    // camera: settle toward the selected node, else the whole map
    const sel = sys.selectedSlug ? byatSlug.get(sys.selectedSlug) : null;
    if (sel) {
      v.copy(sel.pos).applyEuler(root.current.rotation).multiplyScalar(0.42);
      lookTarget.current.lerp(v, 1 - Math.exp(-3 * delta));
    } else {
      lookTarget.current.lerp(v.set(0, 0, 0), 1 - Math.exp(-3 * delta));
    }
    const targetRadius = sel ? Math.max(o.radius - 2.1, 4.6) : o.radius;
    camera.position.set(0, targetRadius * 0.36, targetRadius);
    camera.lookAt(lookTarget.current);

    // node states
    const now = performance.now();
    const coreE = damp(
      (handles.current.get("core")?.glow.opacity ?? 0.3),
      0.30 + CORE_ENERGY[sys.phase] * 0.55,
      3, delta
    );
    // the agent's beams die on their own clock
    const beamAge = (now - sys.flare.at) / 3200;
    if (beamMat.current) beamMat.current.opacity = Math.max(0, 0.85 * (1 - beamAge));

    for (const p of placed) {
      const h = handles.current.get(p.slug);
      if (!h) continue;
      const flared = sys.flare.slugs.includes(p.slug)
        ? Math.max(0, 1 - (now - sys.flare.at) / 3200)
        : 0;
      const hot = (sys.focusSlug === p.slug ? 1 : 0) + (sys.selectedSlug === p.slug ? 0.8 : 0);

      if (p.kind === "core") {
        h.glow.opacity = coreE + flaredPulse(now, sys.pulseAt) * 0.25;
        h.group.rotation.y += delta * (0.2 + CORE_ENERGY[sys.phase] * 0.9);
        h.group.rotation.x += delta * 0.07;
        const s = 1 + Math.sin(t * 1.4) * 0.02 + CORE_ENERGY[sys.phase] * 0.1;
        h.group.scale.setScalar(s);
        continue;
      }

      h.glow.opacity = 0.20 + hot * 0.5 + flared * 0.7;
      h.wire.opacity = 0.46 + hot * 0.5 + flared * 0.6;
      h.dot.color.copy(flared > 0.02 ? IRIS_BRIGHT : p.kind === "work" ? AMBER_BRIGHT : IRIS_BRIGHT);
      const s = (1 + hot * 0.22 + flared * 0.5) * (1 + Math.sin(t * 1.1 + p.angle * 5) * 0.015);
      h.group.scale.setScalar(s);
      h.group.rotation.y += delta * (0.12 + flared * 1.2);
    }

    // the tool wavefront ring at the core
    const since = (now - sys.pulseAt) / 1000;
    if (since < 1.1) {
      const k = 0.4 + since * 3.4;
      ring.current.scale.setScalar(k);
      ringMat.current.opacity = 0.6 * (1 - since / 1.1);
      ring.current.quaternion.copy(camera.quaternion);
    } else {
      ringMat.current.opacity = 0;
    }

    baseEdges.current.opacity = 0.15 + CORE_ENERGY[sys.phase] * 0.08;
    workEdges.current.opacity = 0.13 + CORE_ENERGY[sys.phase] * 0.08;

    // project every node into the DOM label layer — anchored in world
    // space above or below its node, so labels rarely collide
    for (const p of placed) {
      const el = labels.current.get(p.slug);
      const h = handles.current.get(p.slug);
      if (!el || !h) continue;
      h.group.getWorldPosition(v);
      v.y += p.kind === "core" ? 0.78 : p.flip ? -0.4 : 0.4;
      const depth = v.distanceTo(camera.position);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (1 - (v.y * 0.5 + 0.5)) * size.height;
      // a label clipped mid-word at the screen edge reads as a bug; hide it
      // and let the node itself carry the position until it orbits back in.
      // Measured against the label's real width, not just its anchor.
      const half = el.offsetWidth / 2;
      const offscreen =
        x - half < 4 || x + half > size.width - 4 || y < 44 || y > size.height - 20;
      const behind = v.z > 1;
      const anchor = p.flip && p.kind !== "core" ? "0%" : "-100%";
      el.style.transform = `translate(-50%, ${anchor}) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.dataset.hidden = behind || offscreen ? "true" : "false";
      el.style.setProperty("--depth", String(clamp(1.45 - depth / 14, 0.42, 1)));
    }
  });

  const setFocus = useSystem((s) => s.setFocus);
  const setSelected = useSystem((s) => s.setSelected);

  const pick = (p: Placed) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if ((e as unknown as { delta: number }).delta > 6) return; // that was a drag
    if (p.kind === "core") { onEngage(); return; }
    if (useSystem.getState().selectedSlug === p.slug) onEnter(p);
    else setSelected(p.slug);
  };

  const over = (p: Placed) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setFocus(p.slug);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setFocus(null);
    document.body.style.cursor = "";
  };

  const coreGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.42, 1)), []);
  const coreInnerGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.23, 0)), []);
  const sysGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.13)), []);
  const workGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.17, 0)), []);

  return (
    <group ref={root}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          map={tex}
          color={IRIS_DEEP}
          transparent
          opacity={0.62}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <lineSegments geometry={sysEdgeGeo}>
        <lineBasicMaterial ref={baseEdges} color={EDGE_SYS} transparent opacity={0.12} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={workEdgeGeo}>
        <lineBasicMaterial ref={workEdges} color={EDGE_WORK} transparent opacity={0.12} depthWrite={false} />
      </lineSegments>

      <lineSegments geometry={litEdgeGeo}>
        <lineBasicMaterial color={IRIS_BRIGHT} transparent opacity={0.75} depthWrite={false} />
      </lineSegments>

      <lineSegments geometry={beamGeo}>
        <lineBasicMaterial
          ref={beamMat}
          color={IRIS_BRIGHT}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {placed.map((p) => (
        <group key={p.slug} position={p.pos} ref={register(p.slug)}>
          <sprite name="glow" scale={p.kind === "core" ? 2.6 : p.kind === "work" ? 0.9 : 0.7} renderOrder={-1}>
            <spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.2} />
          </sprite>

          {p.kind === "core" ? (
            <>
              <lineSegments name="wire" geometry={coreGeo}>
                <lineBasicMaterial color={IRIS} transparent opacity={0.8} depthWrite={false} />
              </lineSegments>
              <lineSegments geometry={coreInnerGeo} rotation={[0.6, 0.3, 0]}>
                <lineBasicMaterial color={IRIS_BRIGHT} transparent opacity={0.6} depthWrite={false} />
              </lineSegments>
              <mesh name="dot">
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            </>
          ) : (
            <>
              <lineSegments name="wire" geometry={p.kind === "work" ? workGeo : sysGeo}>
                <lineBasicMaterial
                  color={p.kind === "work" ? AMBER : IRIS}
                  transparent
                  opacity={0.52}
                  depthWrite={false}
                />
              </lineSegments>
              <mesh name="dot">
                <sphereGeometry args={[0.028, 10, 10]} />
                <meshBasicMaterial color={p.kind === "work" ? AMBER : IRIS} />
              </mesh>
            </>
          )}

          {/* pick body — generous, invisible */}
          <mesh
            onClick={pick(p)}
            onPointerOver={over(p)}
            onPointerOut={out}
          >
            <sphereGeometry args={[p.kind === "core" ? 0.55 : 0.3, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}

      <mesh ref={ring} position={[0, 0.1, 0]}>
        <ringGeometry args={[0.96, 1, 64]} />
        <meshBasicMaterial ref={ringMat} color={IRIS} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function flaredPulse(now: number, pulseAt: number): number {
  const since = (now - pulseAt) / 1000;
  return since < 1 ? 1 - since : 0;
}

/* ── entry ─────────────────────────────────────────────────────────────── */

export default function SystemMap({
  nodes,
  labels,
  onEnter,
  onEngage,
  compact = false,
  onReady,
}: {
  nodes: PlacedNode[];
  labels: React.MutableRefObject<Map<string, HTMLElement>>;
  onEnter: (node: Placed) => void;
  onEngage: () => void;
  compact?: boolean;
  onReady?: () => void;
}) {
  const placed = useMemo(() => toPlaced(nodes), [nodes]);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.5, 8.2], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      onCreated={() => onReady?.()}
      onPointerMissed={() => useSystem.getState().setSelected(null)}
      aria-hidden
    >
      <Graph placed={placed} labels={labels} onEnter={onEnter} onEngage={onEngage} compact={compact} />
    </Canvas>
  );
}
