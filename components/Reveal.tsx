"use client";

import { useEffect, useRef, useState } from "react";

/* Content is visible by default. The hidden-then-revealed styles are gated
   behind [data-js="on"] in CSS, which the root layout's inline script sets,
   so a failed or blocked script leaves a fully readable page. */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** ms, for siblings that should arrive as a short list rather than at once */
  delay?: number;
  as?: "div" | "li" | "section" | "figure";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <As
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal ${className}`}
      data-shown={shown ? "" : undefined}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </As>
  );
}
