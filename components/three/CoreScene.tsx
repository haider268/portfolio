"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useSystem, type AgentPhase } from "@/lib/state";

/* THE CORE.

   A lattice of points on nested icosahedral shells, joined by hairline
   struts. It is the one object on the site, and it is not decoration: its
   energy, colour temperature and motion follow the agent's real state, and
   every genuine tool event fires a wavefront through it. The scene reads
   the same store the console writes — real backend state, real visual
   state, nothing simulated.

   Everything here is budgeted for a free-tier portfolio: ~900 points, two
   line meshes, one gradient sprite. No postprocessing, no physics, no
   model files. */

/* ── per-phase targets the frame loop eases toward ─────────────────────── */

type Target = { energy: number; warmth: number; spin: number };

const TARGETS: Record<AgentPhase, Target> = {
  idle:      { energy: 0.14, warmth: 0.08, spin: 0.055 },
  listening: { energy: 0.46, warmth: 0.04, spin: 0.10 },
  thinking:  { energy: 0.62, warmth: 0.16, spin: 0.19 },
  tool:      { energy: 0.72, warmth: 0.30, spin: 0.16 },
  speaking:  { energy: 0.52, warmth: 0.60, spin: 0.075 },
  ended:     { energy: 0.07, warmth: 0.02, spin: 0.03 },
};

const damp = THREE.MathUtils.damp;

/* ── shaders ───────────────────────────────────────────────────────────── */

const POINT_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uPulse;   // seconds since the last real tool event
  uniform float uPR;
  varying float vSeed;
  varying float vWave;

  void main() {
    vSeed = aSeed;
    vec3 p = position;
    vec3 dir = normalize(position);

    // slow breathing, per-point phase
    float breathe = sin(uTime * 0.55 + aSeed * 17.0) * 0.5
                  + sin(uTime * 0.90 + aSeed * 31.0) * 0.5;
    p += dir * breathe * (0.014 + uEnergy * 0.085);

    // the tool wavefront: a shell expanding from the centre, then dying
    float front = uPulse * 1.9;
    float w = clamp(1.0 - abs(front - length(position)) * 3.2, 0.0, 1.0)
            * exp(-uPulse * 1.4);
    p += dir * w * 0.14;
    vWave = w;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.1 + aSeed * 2.2)
                 * (1.0 + uEnergy * 0.7 + w * 1.6)
                 * uPR * (3.4 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform float uWarmth;
  uniform float uEnergy;
  varying float vSeed;
  varying float vWave;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = smoothstep(0.5, 0.06, d);
    float t = clamp(uWarmth + vSeed * 0.22 - 0.11, 0.0, 1.0);
    vec3 col = mix(uCool, uWarm, t) + vWave * 0.55;
    float alpha = disc * (0.30 + uEnergy * 0.45 + vSeed * 0.22 + vWave * 0.6);
    gl_FragColor = vec4(col, alpha);
  }
`;

const FIELD_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPR;
  varying float vTwinkle;

  void main() {
    vTwinkle = 0.55 + 0.45 * sin(uTime * (0.3 + aSeed * 0.5) + aSeed * 40.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (1.0 + aSeed * 1.6) * uPR * (5.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FIELD_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uCol;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = smoothstep(0.5, 0.1, d);
    gl_FragColor = vec4(uCol, disc * 0.16 * vTwinkle);
  }
`;

/* ── palette (matches the CSS custom properties) ───────────────────────── */

const COOL = new THREE.Color("#8b95e6"); // iris
const WARM = new THREE.Color("#dfc493"); // warm amber-ivory
const STRUT = new THREE.Color("#5a63b8");

/* ── geometry helpers ──────────────────────────────────────────────────── */

function shellPoints(radius: number, detail: number): { pos: Float32Array; seed: Float32Array } {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const src = geo.getAttribute("position");
  // de-duplicate shared vertices so points sit once on each lattice site
  const seen = new Set<string>();
  const pts: number[] = [];
  for (let i = 0; i < src.count; i++) {
    const x = src.getX(i), y = src.getY(i), z = src.getZ(i);
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pts.push(x, y, z);
  }
  geo.dispose();
  const pos = new Float32Array(pts);
  const seed = new Float32Array(pos.length / 3);
  for (let i = 0; i < seed.length; i++) seed[i] = fract(Math.sin(i * 127.1) * 43758.5453);
  return { pos, seed };
}

function fract(n: number) {
  return n - Math.floor(n);
}

function haloTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(139,149,230,0.55)");
  g.addColorStop(0.35, "rgba(139,149,230,0.16)");
  g.addColorStop(1, "rgba(139,149,230,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── the core group ────────────────────────────────────────────────────── */

function Core({ compact }: { compact: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.Sprite>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null!);
  const struts = useRef<THREE.LineSegments>(null!);

  const { camera, size } = useThree();
  const pointer = useRef({ x: 0, y: 0 });

  const detail = compact ? 2 : 3;

  const { positions, seeds } = useMemo(() => {
    const outer = shellPoints(1.25, detail);
    const mid = shellPoints(0.78, Math.max(detail - 1, 1));
    const core = shellPoints(0.34, 1);
    const positions = new Float32Array(outer.pos.length + mid.pos.length + core.pos.length);
    positions.set(outer.pos, 0);
    positions.set(mid.pos, outer.pos.length);
    positions.set(core.pos, outer.pos.length + mid.pos.length);
    const seeds = new Float32Array(outer.seed.length + mid.seed.length + core.seed.length);
    seeds.set(outer.seed, 0);
    seeds.set(mid.seed, outer.seed.length);
    seeds.set(core.seed, outer.seed.length + mid.seed.length);
    return { positions, seeds };
  }, [detail]);

  const strutGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.25, 1)), []);
  const innerStrutGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.78, 1)), []);
  const halotex = useMemo(haloTexture, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: 0.14 },
      uWarmth: { value: 0.08 },
      uPulse: { value: 1e3 },
      uPR: { value: 1 },
      uCool: { value: COOL },
      uWarm: { value: WARM },
    }),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sys = useSystem.getState();
    const target = TARGETS[sys.phase];

    const u = uniforms;
    u.uTime.value = t;
    u.uEnergy.value = damp(u.uEnergy.value, target.energy, 2.2, delta);
    u.uWarmth.value = damp(u.uWarmth.value, target.warmth, 2.0, delta);
    u.uPulse.value = (performance.now() - sys.pulseAt) / 1000;
    u.uPR.value = Math.min(state.gl.getPixelRatio(), 2);

    // slow rotation plus cursor influence, both damped
    const g = group.current;
    g.rotation.y += delta * damp(0, target.spin, 1, 1) * 1.0 + delta * target.spin;
    g.rotation.x = damp(g.rotation.x, pointer.current.y * -0.16, 2.5, delta);
    g.rotation.z = damp(g.rotation.z, pointer.current.x * 0.06, 2.5, delta);
    inner.current.rotation.y -= delta * target.spin * 1.7;
    inner.current.rotation.x += delta * target.spin * 0.5;

    // the core drifts toward centre stage while a session is live
    const wide = size.width > 860;
    const tx = sys.live ? 0 : wide ? 0.92 : 0;
    const ty = sys.live ? 0.18 : wide ? -0.05 : 0.34;
    g.position.x = damp(g.position.x, tx, 2.2, delta);
    g.position.y = damp(g.position.y, ty, 2.2, delta);

    // camera leans in during a session
    const cz = sys.live ? 3.55 : 4.35;
    camera.position.z = damp(camera.position.z, cz, 1.6, delta);

    // halo and struts follow energy
    const e = u.uEnergy.value;
    (halo.current.material as THREE.SpriteMaterial).opacity = 0.10 + e * 0.22;
    const s = 4.6 + e * 1.2;
    halo.current.scale.set(s, s, 1);
    (struts.current.material as THREE.LineBasicMaterial).opacity = 0.07 + e * 0.13;

    // the tool wavefront also crosses the struts as a visible ring
    const since = u.uPulse.value;
    if (since < 1.1) {
      const k = 1 + since * 2.3;
      ring.current.scale.set(k, k, k);
      ringMat.current.opacity = Math.max(0, 0.4 * (1 - since / 1.1));
      ring.current.quaternion.copy(camera.quaternion);
    } else {
      ringMat.current.opacity = 0;
    }
  });

  return (
    <group
      ref={group}
      onPointerMove={undefined}
    >
      {/* pointer tracked at window level in Scene below */}
      <PointerTracker target={pointer} />

      <sprite ref={halo} renderOrder={-1}>
        <spriteMaterial
          map={halotex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.14}
        />
      </sprite>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={POINT_VERT}
          fragmentShader={POINT_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments ref={struts} geometry={strutGeo}>
        <lineBasicMaterial color={STRUT} transparent opacity={0.1} depthWrite={false} />
      </lineSegments>

      <group ref={inner}>
        <lineSegments geometry={innerStrutGeo}>
          <lineBasicMaterial color={STRUT} transparent opacity={0.08} depthWrite={false} />
        </lineSegments>
      </group>

      <mesh ref={ring}>
        <ringGeometry args={[0.985, 1.0, 72]} />
        <meshBasicMaterial
          ref={ringMat}
          color={COOL}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/** window-level pointer → normalised coords, no re-renders */
function PointerTracker({ target }: { target: React.MutableRefObject<{ x: number; y: number }> }) {
  useMemo(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
  }, [target]);
  return null;
}

/* ── the ambient field ─────────────────────────────────────────────────── */

function Field({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // a thick shell well behind the core
      const r = 5 + Math.pow(Math.random(), 0.7) * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 2;
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPR: { value: 1 },
      uCol: { value: new THREE.Color("#aab2e8") },
    }),
    []
  );

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uPR.value = Math.min(state.gl.getPixelRatio(), 2);
    ref.current.rotation.y += delta * 0.008;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={FIELD_VERT}
        fragmentShader={FIELD_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── entry ─────────────────────────────────────────────────────────────── */

export default function CoreScene({
  compact = false,
  onReady,
}: {
  compact?: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.35], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={() => onReady?.()}
      aria-hidden
    >
      <Core compact={compact} />
      <Field count={compact ? 220 : 480} />
    </Canvas>
  );
}
