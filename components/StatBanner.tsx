"use client";

import { useRef } from "react";

/* A figure given physical presence.

   The number floats on a real 3D stack — value forward, wireframe sunk
   behind, hairline beam between — and the whole plate tilts a few degrees
   toward the pointer, the same material language as the map. CSS transforms
   only: no canvas, no WebGL cost on a reading page. Reduced motion gets the
   composed, untilted plate.

   Used from MDX:  <StatBanner value="10,000+" label="calls processed"
   sub="2,000+ booked" />  — tone="system" swaps the metal from work-amber
   to system-iris for figures that belong to the machinery. */

export default function StatBanner({
  value,
  label,
  sub,
  tone = "work",
}: {
  value: string;
  label: string;
  sub?: string;
  tone?: "work" | "system";
}) {
  const plate = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent) {
    const el = plate.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
  }
  function onLeave() {
    plate.current?.style.setProperty("--ry", "0deg");
    plate.current?.style.setProperty("--rx", "0deg");
  }

  return (
    <div className="stat3d" data-tone={tone} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="stat3d__plate" ref={plate}>
        <svg className="stat3d__wire" viewBox="0 0 200 200" aria-hidden="true">
          <g fill="none" strokeWidth="0.8">
            <polygon points="100,18 172,60 172,140 100,182 28,140 28,60" />
            <polygon points="100,52 143,77 143,124 100,149 57,124 57,77" opacity=".7" />
            <line x1="100" y1="18" x2="100" y2="52" />
            <line x1="172" y1="60" x2="143" y2="77" />
            <line x1="172" y1="140" x2="143" y2="124" />
            <line x1="100" y1="182" x2="100" y2="149" />
            <line x1="28" y1="140" x2="57" y2="124" />
            <line x1="28" y1="60" x2="57" y2="77" />
          </g>
          <g>
            {[[100, 18], [172, 60], [172, 140], [100, 182], [28, 140], [28, 60]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
            ))}
          </g>
        </svg>
        <span className="stat3d__beam" aria-hidden="true" />
        <div className="stat3d__body">
          <span className="stat3d__value">{value}</span>
          <span className="stat3d__label">{label}</span>
          {sub && <span className="stat3d__sub">{sub}</span>}
        </div>
        <span className="stat3d__tick stat3d__tick--tl" aria-hidden="true" />
        <span className="stat3d__tick stat3d__tick--br" aria-hidden="true" />
      </div>
    </div>
  );
}
