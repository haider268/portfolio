import { getCaseStudies, type Doc } from "@/lib/content";

/* The page's own constellation.

   A banner in the map's material language — but never decoration: it draws
   THIS document's real edges. A case study shows the subsystems it runs on;
   a subsystem shows the production work that depends on it. The data is the
   same `uses` frontmatter the homepage map draws, so the two can never
   disagree. Server-rendered SVG on design tokens: zero client cost, and
   every palette branch inherits it.

   Geometry is deterministic per slug — a small rotation seed keeps sibling
   pages from looking stamped from one die. */

const SHORT: Record<string, string> = {
  "wellness-launch": "Wellness launch",
  "signl": "Signl",
  "followup-engine": "Follow-up engine",
  "voice-deployments": "Client deployments",
  "luma-bistro": "Luma Bistro",
  "campus-navigation": "Campus navigation",
  "site-agent": "This site's agent",
  "voice-agents": "Voice agents",
  "speech-loop": "Speech loop",
  "conversation-memory": "Conversation memory",
  "scheduling-timezone": "Timezone engine",
  "micro-tools": "Micro-tools",
  "pipelines-crm": "Pipelines & CRM",
  "gtm-engineering": "GTM middleware",
  "messaging-automation": "Messaging",
  "llm-orchestration": "LLM orchestration",
  "reliability": "Reliability",
  "call-qa": "Call QA",
};

function seed(slug: string): number {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}

/** a wireframe polyhedron: two nested hexagons, cross-strutted */
function poly(cx: number, cy: number, r: number, rot: number): { outer: string; inner: string; struts: [number, number, number, number][] } {
  const pt = (rad: number, i: number, phase: number) => {
    const a = rot + phase + (i * Math.PI) / 3;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a) * 0.92] as const;
  };
  const O = Array.from({ length: 6 }, (_, i) => pt(r, i, 0));
  const I = Array.from({ length: 6 }, (_, i) => pt(r * 0.55, i, Math.PI / 6));
  return {
    outer: O.map((p) => p.join(",")).join(" "),
    inner: I.map((p) => p.join(",")).join(" "),
    struts: O.map((p, i) => [p[0], p[1], I[i][0], I[i][1]] as [number, number, number, number]),
  };
}

/** a small octahedron: a diamond with an equator */
function diamond(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r * 0.72},${cy} ${cx},${cy + r} ${cx - r * 0.72},${cy}`;
}

export default function DocConstellation({ doc }: { doc: Doc }) {
  const isWork = doc.collection === "case-studies";
  const related: { slug: string; label: string }[] = isWork
    ? doc.uses.map((u) => ({ slug: u, label: SHORT[u] ?? u }))
    : getCaseStudies("automation")
        .filter((w) => w.uses.includes(doc.slug))
        .map((w) => ({ slug: w.slug, label: SHORT[w.slug] ?? w.title }));

  if (related.length === 0) return null;

  const s = seed(doc.slug);
  const rot = (s % 60) * (Math.PI / 180);
  const W = 920;
  const H = 250;
  const cx = 150;
  const cy = 125;
  const core = poly(cx, cy, 62, rot);

  // satellites fan across the remaining width, staggered above/below
  const n = related.length;
  const x0 = 380;
  const x1 = W - 70;
  const sats = related.map((r0, i) => {
    const x = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1);
    const y = 70 + ((i + (s % 2)) % 2) * 106 + ((s >> 2) % 13) - 6;
    return { ...r0, x, y };
  });

  const centerClass = isWork ? "cst--work" : "cst--sys";
  const satClass = isWork ? "cst--sys" : "cst--work";
  const label = isWork
    ? `Runs on: ${related.map((r0) => r0.label).join(", ")}`
    : `In production in: ${related.map((r0) => r0.label).join(", ")}`;

  return (
    <figure className="cst" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* the atmospheric island behind the document's node */}
        <radialGradient id={`cstg-${doc.slug}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" className="cst__halo0" />
          <stop offset="100%" className="cst__halo1" />
        </radialGradient>
        <circle cx={cx} cy={cy} r={105} fill={`url(#cstg-${doc.slug})`} />

        {/* real edges, document → relations */}
        {sats.map((r0) => (
          <line
            key={`e-${r0.slug}`}
            className="cst__edge"
            x1={cx + 58}
            y1={cy}
            x2={r0.x}
            y2={r0.y}
          />
        ))}

        {/* the document itself */}
        <g className={centerClass}>
          <polygon className="cst__wire" points={core.outer} />
          <polygon className="cst__wire cst__wire--in" points={core.inner} />
          {core.struts.map(([ax, ay, bx, by], i) => (
            <line key={i} className="cst__wire cst__wire--in" x1={ax} y1={ay} x2={bx} y2={by} />
          ))}
          <circle className="cst__dot" cx={cx} cy={cy} r={4} />
        </g>

        {/* its relations */}
        {sats.map((r0) => (
          <g key={r0.slug} className={satClass}>
            <polygon className="cst__wire" points={diamond(r0.x, r0.y, 16)} />
            <line className="cst__wire cst__wire--in" x1={r0.x - 11.5} y1={r0.y} x2={r0.x + 11.5} y2={r0.y} />
            <circle className="cst__dot" cx={r0.x} cy={r0.y} r={2.6} />
            <text className="cst__label" x={r0.x} y={r0.y + (r0.y < 125 ? -28 : 36)}>
              {r0.label}
            </text>
          </g>
        ))}

        <text className="cst__legend" x={cx} y={cy + 92}>
          {isWork ? "runs on" : "in production in"}
        </text>
      </svg>
    </figure>
  );
}
