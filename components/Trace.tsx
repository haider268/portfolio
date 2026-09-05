"use client";

import { useEffect, useRef, useState } from "react";

/* One lead, from form submit to confirmation SMS.

   The subject is time, so the thing is paced by time. A single rAF loop drives
   one clock; the clock reveals each row as it passes that row's timestamp and
   draws the rail beside them. The wait before the dial is therefore a wait you
   sit through. Reduced motion gets the finished state. */

type Row = { t: string; event: string; meta: string };

const ROWS: Row[] = [
  { t: "00:00.0", event: "form submitted", meta: "Meta lead ad · paid social" },
  { t: "00:02.1", event: "contact created", meta: "CRM · tagged · pipeline stage set" },
  { t: "00:03.4", event: "validation passed", meta: "phone + required fields present" },
  { t: "00:41.7", event: "outbound call placed", meta: "inside the 60-second ceiling" },
  { t: "01:12.9", event: "timezone resolved", meta: "tool call · IANA zone from number + form" },
  { t: "01:28.3", event: "availability checked", meta: "tool call · live calendar read" },
  { t: "02:04.6", event: "appointment booked", meta: "slot held · conflict-checked" },
  { t: "02:05.1", event: "SMS sent", meta: "confirmation · address · cancel link" },
];

/** the whole 2m05s replayed in this many ms */
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

export default function Trace() {
  const ref = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const span = seconds(ROWS[ROWS.length - 1].t);

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

  // the finished state is what renders on the server and without scripting
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
        {ROWS.map((r) => {
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
