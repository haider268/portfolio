"use client";

import { useEffect, useRef, useState } from "react";

/* One lead, from form submit to confirmation SMS.

   The point of the section is TIME, so the section is paced by time. A single
   rAF loop drives one clock; the clock reveals each row when it passes that
   row's real timestamp, and the same clock draws the rail beside them. The
   38-second wait before the dial is therefore visible as a wait — the page
   spends real seconds on it while the counter spins, then everything after
   the pickup lands quickly. Nothing here is decorative easing; it is the
   actual event spacing, compressed by a constant factor.

   Reduced motion gets the finished state: every row present, rail full, clock
   parked on the final timestamp. */

export type TraceRow = {
  /** mm:ss.s */
  t: string;
  event: string;
  meta: string;
};

/** the whole 2m05s trace, replayed in this many ms */
const REPLAY_MS = 5000;

function seconds(t: string): number {
  const [m, s] = t.split(":");
  return Number(m) * 60 + Number(s);
}

function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

export default function Trace({ rows }: { rows: TraceRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const span = seconds(rows[rows.length - 1].t);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setElapsed(span);
      return;
    }

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min((now - start) / REPLAY_MS, 1);
      setElapsed(p * span);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.35 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [span]);

  // before the replay starts, render the finished state on the server and for
  // anyone whose script never runs
  const now = elapsed ?? span;
  const progress = Math.min(now / span, 1);

  return (
    <div className="trace" ref={ref}>
      <div className="trace__clock" aria-hidden="true">
        <span className="label">elapsed</span>
        <span className="trace__count">{clock(now)}</span>
      </div>

      <ol className="trace__list">
        <span
          className="trace__rail"
          style={{ "--p": progress } as React.CSSProperties}
          aria-hidden="true"
        />
        {rows.map((r) => {
          const passed = now >= seconds(r.t) - 0.001;
          return (
            <li key={r.t + r.event} className="trace__row" data-passed={passed ? "" : undefined}>
              <span className="trace__t">{r.t}</span>
              <span className="trace__event">{r.event}</span>
              <span className="trace__meta">{r.meta}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
