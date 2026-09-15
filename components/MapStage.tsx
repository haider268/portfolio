"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { layoutNodes, type MapNode, type PlacedNode } from "@/lib/map-layout";
import { useSystem } from "@/lib/state";

/* THE STAGE IS THE SITE.

   The homepage is this one viewport: the practice drawn as a navigable
   map. The DOM label layer is the real navigation — anchors, focusable,
   crawlable — and the WebGL layer underneath gives it space, relationship,
   and the agent's live activity. Where WebGL or motion is unavailable, the
   same graph renders as an HTML manifest: the map's information, standing
   still. Nobody gets an apology screen.

   Interaction contract:
     hover / focus a label or node  →  it lights, with everything it touches
     click a node                   →  inspect (panel + camera settle)
     click again / Enter / label    →  enter the document
     the core                       →  opens the agent console
     drag orbits · wheel zooms · Esc releases                              */

const SystemMap = dynamic(() => import("./three/SystemMap"), { ssr: false });

type SceneMode = "pending" | "3d" | "static";

export default function MapStage({
  nodes,
  autoBegin = false,
}: {
  nodes: MapNode[];
  autoBegin?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<SceneMode>("pending");
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);

  const placed = useMemo(() => layoutNodes(nodes), [nodes]);
  const labels = useRef(new Map<string, HTMLElement>());

  const live = useSystem((s) => s.live);
  const phase = useSystem((s) => s.phase);
  const focusSlug = useSystem((s) => s.focusSlug);
  const selectedSlug = useSystem((s) => s.selectedSlug);
  const setLive = useSystem((s) => s.setLive);
  const setFocus = useSystem((s) => s.setFocus);
  const setSelected = useSystem((s) => s.setSelected);

  useEffect(() => {
    if (autoBegin) setLive(true);
  }, [autoBegin, setLive]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setMode(reduced || !webgl ? "static" : "3d");

    const mq = window.matchMedia("(max-width: 860px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);

    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", key);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("keydown", key);
    };
  }, [setSelected]);

  // leaving the page must not leave a stale selection behind
  useEffect(() => () => { setSelected(null); setFocus(null); }, [setSelected, setFocus]);

  const setLabel = useCallback((slug: string) => (el: HTMLElement | null) => {
    if (el) labels.current.set(slug, el);
    else labels.current.delete(slug);
  }, []);

  const onEnter = useCallback(
    (node: { href: string }) => router.push(node.href),
    [router]
  );
  const onEngage = useCallback(() => setLive(true), [setLive]);

  const inspecting =
    placed.find((p) => p.slug === (selectedSlug ?? focusSlug)) ?? null;

  const workCount = nodes.filter((n) => n.kind === "work").length;
  const sysCount = nodes.filter((n) => n.kind === "system").length;

  return (
    <section className="mapstage" data-live={live || undefined} data-phase={phase} aria-label="System map">
      {/* ── the spatial layer ─────────────────────────────────────────── */}
      {mode === "3d" && (
        <div className="mapstage__scene" data-ready={ready || undefined} aria-hidden="true">
          <SystemMap
            nodes={placed}
            labels={labels}
            onEnter={onEnter}
            onEngage={onEngage}
            compact={compact}
            onReady={() => setReady(true)}
          />
        </div>
      )}

      {/* ── the label layer: the real navigation ──────────────────────── */}
      {mode === "3d" && (
        <nav className="mlabels" data-ready={ready || undefined} aria-label="Map">
          {placed.map((p) =>
            p.kind === "core" ? (
              <button
                key={p.slug}
                ref={setLabel(p.slug)}
                type="button"
                className="mlabel"
                data-kind="core"
                data-active={(focusSlug === p.slug || live) || undefined}
                onMouseEnter={() => setFocus(p.slug)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(p.slug)}
                onBlur={() => setFocus(null)}
                onClick={onEngage}
              >
                <span className="mlabel__dot" aria-hidden="true" />
                {p.label}
              </button>
            ) : (
              <a
                key={p.slug}
                ref={setLabel(p.slug)}
                href={p.href}
                className="mlabel"
                data-kind={p.kind}
                data-active={(focusSlug === p.slug || selectedSlug === p.slug) || undefined}
                onMouseEnter={() => setFocus(p.slug)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => { setFocus(p.slug); setSelected(p.slug); }}
                onBlur={() => setFocus(null)}
              >
                <span className="mlabel__dot" aria-hidden="true" />
                {p.label}
              </a>
            )
          )}
        </nav>
      )}

      {/* ── the manifest: the same graph, standing still ──────────────── */}
      {mode === "static" && <Manifest placed={placed} onEngage={onEngage} />}

      {/* ── HUD ───────────────────────────────────────────────────────── */}
      <div className="hud">
        <div className="hud__ident">
          <p className="hud__kicker">system map</p>
          <p className="hud__line">
            {workCount} systems in production · {sysCount} subsystems ·
            one live agent
          </p>
        </div>

        {mode === "3d" && (
          <p className="hud__hint" data-ready={ready || undefined}>
            drag to orbit · select a node · select again to enter · esc releases
          </p>
        )}

        <aside
          className="hud__panel"
          data-open={(inspecting && mode === "3d") || undefined}
          aria-live="polite"
        >
          {inspecting && (
            <>
              <p className="hud__panelKind">
                {inspecting.kind === "core"
                  ? "live agent"
                  : inspecting.kind === "work"
                  ? "system in production"
                  : "subsystem"}
              </p>
              <p className="hud__panelTitle">{inspecting.title}</p>
              {inspecting.kicker && <p className="hud__panelKicker">{inspecting.kicker}</p>}
              {inspecting.metric && <p className="hud__panelMetric">{inspecting.metric}</p>}
              {inspecting.kind === "core" ? (
                <button type="button" className="hud__enter" onClick={onEngage}>
                  engage →
                </button>
              ) : (
                <a className="hud__enter" href={inspecting.href}>
                  enter →
                </a>
              )}
            </>
          )}
        </aside>

      </div>
    </section>
  );
}

/* The graph without a renderer: subsystems with the work that runs on
   them nested beneath. Same information, same order, plain HTML. */
function Manifest({
  placed,
  onEngage,
}: {
  placed: PlacedNode[];
  onEngage: () => void;
}) {
  const systems = placed.filter((p) => p.kind === "system");
  const work = placed.filter((p) => p.kind === "work");

  return (
    <div className="manifest">
      <div className="manifest__core">
        <button type="button" className="manifest__agent" onClick={onEngage}>
          <span className="manifest__agentDot" aria-hidden="true" />
          Vega — voice or text, answers from this map
        </button>
      </div>
      <ul className="manifest__list">
        {systems.map((s) => {
          const dependents = work.filter((w) => w.uses.includes(s.slug));
          return (
            <li key={s.slug} className="manifest__sys">
              <a href={s.href} className="manifest__sysLink">
                {s.label}
                {s.metric && <span>{s.metric}</span>}
              </a>
              {dependents.length > 0 && (
                <ul className="manifest__work">
                  {dependents.map((w) => (
                    <li key={w.slug}>
                      <a href={w.href}>{w.label}</a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
