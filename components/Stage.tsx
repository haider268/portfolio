"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSystem } from "@/lib/state";
import AgentConsole from "./agent/AgentConsole";

/* The stage: one viewport where the system lives.

   The 3D core loads only here, dynamically, and only when the device can
   carry it — reduced motion or no WebGL gets the static emblem, which is
   the same composition standing still, never an apology. The emblem also
   renders first for everyone, so nothing flashes while the scene code
   arrives. */

const CoreScene = dynamic(() => import("./three/CoreScene"), { ssr: false });

type SceneMode = "pending" | "3d" | "static";

export default function Stage({ autoBegin = false }: { autoBegin?: boolean }) {
  const [mode, setMode] = useState<SceneMode>("pending");
  const [sceneReady, setSceneReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const live = useSystem((s) => s.live);
  const phase = useSystem((s) => s.phase);
  const setLive = useSystem((s) => s.setLive);

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
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <section className="stage" data-live={live || undefined} data-phase={phase} aria-label="Introduction">
      <div className="stage__scene" data-ready={sceneReady || undefined} aria-hidden="true">
        <Emblem />
        {mode === "3d" && (
          <div className="stage__canvas">
            <CoreScene compact={compact} onReady={() => setSceneReady(true)} />
          </div>
        )}
      </div>

      <div className="stage__overlay">
        <div className="stage__intro">
          <p className="stage__kicker">AI automation &amp; GTM systems engineer</p>
          <h1 className="stage__claim">
            The opening week sold&nbsp;out.
            <br />
            <em>Nobody answered the phone.</em>
          </h1>
          <p className="stage__lead">
            I build production voice agents and revenue automation — from
            platform deployments to speech loops written from scratch. This
            site runs one.
          </p>
        </div>

        <div className="stage__console">
          <AgentConsole />
        </div>

        <a className="stage__down" href="#work">
          <span aria-hidden="true">01</span> work <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}

/* The static core: the same lattice drawn once. Shown under the canvas
   while it loads, and instead of it where it cannot run. */
function Emblem() {
  return (
    <svg className="emblem" viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id="em-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139,149,230,0.20)" />
          <stop offset="55%" stopColor="rgba(139,149,230,0.05)" />
          <stop offset="100%" stopColor="rgba(139,149,230,0)" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#em-halo)" />
      <g stroke="rgba(90,99,184,0.5)" strokeWidth="0.7" fill="none">
        <polygon points="200,80 304,140 304,260 200,320 96,260 96,140" />
        <polygon points="200,120 269,160 269,240 200,280 131,240 131,160" opacity="0.7" />
        <line x1="200" y1="80" x2="200" y2="120" />
        <line x1="304" y1="140" x2="269" y2="160" />
        <line x1="304" y1="260" x2="269" y2="240" />
        <line x1="200" y1="320" x2="200" y2="280" />
        <line x1="96" y1="260" x2="131" y2="240" />
        <line x1="96" y1="140" x2="131" y2="160" />
      </g>
      <g fill="#8b95e6">
        {[
          [200, 80], [304, 140], [304, 260], [200, 320], [96, 260], [96, 140],
          [200, 120], [269, 160], [269, 240], [200, 280], [131, 240], [131, 160],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i < 6 ? 2.4 : 1.8} opacity={i < 6 ? 0.85 : 0.6} />
        ))}
        <circle cx="200" cy="200" r="3.4" opacity="0.95" />
      </g>
    </svg>
  );
}
