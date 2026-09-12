/* The flagship path, alive.

   The same two claims the prose cannot make as fast: validation sits BEFORE
   the dial, and the agent hangs off a tool bus so every fact it states is a
   live read. Here they are watched rather than read — lead marks travel the
   wire, one is dropped at validation and never reaches a dial, one books.

   Motion is SMIL <animateMotion>: no script, no dependency, and CSS hides
   the moving marks entirely under prefers-reduced-motion, leaving the full
   drawn system. Numbers are the real ones from the profile: the 60-second
   ceiling per lead, timezone resolution ~250ms. */

const DESCRIPTION =
  "Pipeline diagram. A paid-social lead form feeds the CRM, which tags the contact and sets its pipeline stage. " +
  "Middleware then validates the phone number and required fields before any dial; records that fail are dropped and never called. " +
  "Valid records reach the voice agent within sixty seconds of that lead's own submission. The agent hangs off a tool bus of " +
  "sub-second tools — timezone resolution at around 250 milliseconds, live calendar availability, mid-call SMS, and team task " +
  "creation — so it answers from live reads rather than from its own context. The booking is written back to the CRM. In " +
  "parallel, an SMS and email nurture track runs gated to the lead's own local business hours.";

/* one node: hairline box + label lines */
function Node({
  x, y, w, h, lines, sub, tone,
}: {
  x: number; y: number; w: number; h: number;
  lines: string[]; sub?: string; tone?: "out" | "dim";
}) {
  const cx = x + w / 2;
  const firstY = y + h / 2 - ((lines.length - 1) * 7) - (sub ? 5 : 0) + 4;
  return (
    <g>
      <rect className={`pipe__box${tone ? ` pipe__box--${tone}` : ""}`} x={x} y={y} width={w} height={h} rx="2" />
      {lines.map((l, i) => (
        <text key={l} className={`pipe__t${tone === "out" ? " pipe__t--out" : ""}`} x={cx} y={firstY + i * 14}>
          {l}
        </text>
      ))}
      {sub && (
        <text className="pipe__s" x={cx} y={firstY + lines.length * 14 + 1}>
          {sub}
        </text>
      )}
    </g>
  );
}

export default function SystemDiagram() {
  return (
    <figure className="figure pipe" role="img" aria-label={DESCRIPTION}>
      {/* ── wide: left to right ─────────────────────────────────────────── */}
      <svg className="pipe__wide" viewBox="0 0 1000 430" aria-hidden="true" focusable="false">
        {/* main wire */}
        <path className="pipe__wire pipe__wire--main" d="M158 210 H 812" />
        {/* nurture branch: CRM up and across */}
        <path className="pipe__wire" d="M282 186 V 96 H 372" />
        {/* drop branch: validate down */}
        <path className="pipe__wire pipe__wire--drop" d="M468 234 V 318" />
        {/* tool bus: voice agent down, spine across */}
        <path className="pipe__wire" d="M654 234 V 300 M 560 300 H 948" />
        <path className="pipe__wire" d="M584 300 V 330 M 700 300 V 330 M 816 300 V 330 M 924 300 V 330" />
        {/* nurture return + write-back hint */}
        <path className="pipe__wire" d="M736 96 H 886 V 182" />

        <Node x={38} y={182} w={120} h={56} lines={["lead form"]} sub="paid social" />
        <Node x={222} y={182} w={120} h={56} lines={["CRM"]} sub="tag · stage" />
        <Node x={408} y={182} w={120} h={56} lines={["validate"]} sub="phone · fields" />
        <Node x={594} y={182} w={120} h={56} lines={["voice agent"]} sub="calls · qualifies" />
        <Node x={812} y={178} w={150} h={64} lines={["booked"]} sub="CRM write-back" tone="out" />

        <Node x={372} y={68} w={364} h={56} lines={["SMS + email nurture"]} sub="gated to the lead's local business hours" tone="dim" />
        <Node x={404} y={318} w={128} h={48} lines={["dropped"]} sub="never dialled" tone="dim" />

        {/* the tool bus */}
        <text className="pipe__s pipe__s--left" x={560} y={290}>tool bus — every fact is a live read</text>
        <Node x={536} y={330} w={96} h={44} lines={["timezone"]} sub="~250ms" tone="dim" />
        <Node x={652} y={330} w={96} h={44} lines={["calendar"]} sub="live slots" tone="dim" />
        <Node x={768} y={330} w={96} h={44} lines={["SMS"]} sub="mid-call" tone="dim" />
        <Node x={884} y={330} w={80} h={44} lines={["task"]} sub="for the team" tone="dim" />

        {/* timing figures on the wire */}
        <text className="pipe__f" x={561} y={200}>≤60s</text>
        <text className="pipe__s" x={561} y={166}>from that lead&rsquo;s own submission</text>

        {/* lead marks: real journeys, no script */}
        <g className="pipe__marks">
          {/* books */}
          <circle className="pipe__lead" r="3.4">
            <animateMotion dur="7s" repeatCount="indefinite" path="M158 210 H 812" keyPoints="0;0.18;0.24;0.46;0.52;0.78;0.86;1" keyTimes="0;0.14;0.22;0.4;0.5;0.72;0.8;1" calcMode="linear" />
          </circle>
          {/* dropped at validation */}
          <circle className="pipe__lead pipe__lead--drop" r="2.8">
            <animateMotion dur="7s" begin="3.2s" repeatCount="indefinite" path="M158 210 H 468 V 318" keyPoints="0;0.6;0.62;1" keyTimes="0;0.5;0.62;1" calcMode="linear" />
          </circle>
          {/* nurture track */}
          <circle className="pipe__lead pipe__lead--soft" r="2.4">
            <animateMotion dur="9s" begin="1.4s" repeatCount="indefinite" path="M282 186 V 96 H 736 H 886 V 182" />
          </circle>
        </g>
      </svg>

      {/* ── narrow: the same system, top to bottom ──────────────────────── */}
      <svg className="pipe__narrow" viewBox="0 0 360 660" aria-hidden="true" focusable="false">
        <path className="pipe__wire pipe__wire--main" d="M104 64 V 588" />
        <path className="pipe__wire" d="M104 130 H 232" />
        <path className="pipe__wire pipe__wire--drop" d="M104 262 H 232" />
        <path className="pipe__wire" d="M104 400 H 132 M104 448 H 132 M104 496 H 132 M104 544 H 132" />

        <Node x={24} y={16} w={160} h={48} lines={["lead form"]} sub="paid social" />
        <Node x={24} y={106} w={160} h={48} lines={["CRM · tag · stage"]} />
        <Node x={24} y={196} w={160} h={48} lines={["validate"]} sub="phone · fields" />
        <Node x={232} y={238} w={116} h={48} lines={["dropped"]} sub="never dialled" tone="dim" />
        <Node x={232} y={106} w={116} h={48} lines={["nurture"]} sub="lead's hours" tone="dim" />
        <Node x={24} y={306} w={160} h={48} lines={["voice agent"]} sub="calls · qualifies" />

        <text className="pipe__s pipe__s--left" x={24} y={382}>tool bus — live reads</text>
        <Node x={140} y={380} w={200} h={40} lines={["timezone ~250ms"]} tone="dim" />
        <Node x={140} y={428} w={200} h={40} lines={["calendar · live slots"]} tone="dim" />
        <Node x={140} y={476} w={200} h={40} lines={["SMS · mid-call"]} tone="dim" />
        <Node x={140} y={524} w={200} h={40} lines={["task · for the team"]} tone="dim" />

        <Node x={24} y={588} w={324} h={56} lines={["booked"]} sub="CRM write-back" tone="out" />

        <text className="pipe__f" x={140} y={288}>≤60s per lead</text>

        <g className="pipe__marks">
          <circle className="pipe__lead" r="3.2">
            <animateMotion dur="7s" repeatCount="indefinite" path="M104 64 V 588" />
          </circle>
          <circle className="pipe__lead pipe__lead--drop" r="2.6">
            <animateMotion dur="7s" begin="3.4s" repeatCount="indefinite" path="M104 64 V 262 H 232" />
          </circle>
        </g>
      </svg>

      <figcaption>
        Validation before the dial. Every fact from a live read. No human at
        any stage.
      </figcaption>
    </figure>
  );
}
