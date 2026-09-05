/* The mechanism, not the interface.

   Two claims here that prose cannot make as quickly: validation sits BEFORE
   the dial, so a malformed record is dropped instead of burned on a failed
   call; and the agent hangs off a tool bus, so every fact it states came from
   a live read rather than its own context window.

   Both drawings carry the same information. The wide one runs left to right
   because a pipeline reads that way; below 760px it would either overflow the
   page or shrink its labels to nothing, so the narrow one runs top to bottom
   instead. Only one is ever rendered. The accessible description lives on the
   <figure>, so the swap does not duplicate or drop it for screen readers.

   Every stroke carries pathLength="1", which normalises dash maths to a single
   unit regardless of the real geometry — that is what lets one CSS rule trace
   every line in the figure as the signal reaches it. */

const DESCRIPTION =
  "Pipeline diagram. A Meta lead form feeds the CRM, which tags the contact and sets its pipeline stage. " +
  "Middleware then validates the phone number and required fields before any dial; records that fail are dropped and never called. " +
  "Valid records reach the voice agent within sixty seconds. The agent hangs off a tool bus of four sub-second tools — " +
  "timezone resolution at around 250 milliseconds, live calendar availability, mid-call SMS, and team task creation — " +
  "so it answers from live reads rather than from its own context. The booking is written back to the CRM. " +
  "In parallel, an SMS and email nurture track runs gated to the lead's own local business hours.";

export default function SystemDiagram() {
  return (
    <figure className="figure dgm" role="img" aria-label={DESCRIPTION}>
      {/* ── wide: left-to-right pipeline ─────────────────────────────── */}
      <svg className="dgm__wide" viewBox="0 0 1000 500" aria-hidden="true" focusable="false">
        <defs>
          <marker id="dgm-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
          </marker>
          <marker id="dgm-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
          </marker>
        </defs>

        <g style={{ "--i": 0 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="6" y="202" width="146" height="58" />
          <text className="dgm-t" x="79" y="226">Meta lead</text>
          <text className="dgm-t" x="79" y="242">form</text>
        </g>

        <g style={{ "--i": 1 } as React.CSSProperties}>
          <line className="dgm-wire" pathLength="1" x1="152" y1="231" x2="194" y2="231" markerEnd="url(#dgm-a)" />
          <text className="dgm-s" x="173" y="192">webhook</text>
        </g>

        <g style={{ "--i": 2 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="200" y="202" width="146" height="58" />
          <text className="dgm-t" x="273" y="226">CRM · tag</text>
          <text className="dgm-t" x="273" y="242">pipeline stage</text>
        </g>

        <g style={{ "--i": 3 } as React.CSSProperties}>
          <path className="dgm-wire" pathLength="1" d="M273 202 L273 91 L388 91" markerEnd="url(#dgm-a)" fill="none" />
          <rect className="dgm-box dgm-box--dashed" pathLength="1" x="394" y="64" width="340" height="54" />
          <text className="dgm-t" x="564" y="86">SMS + email nurture</text>
          <text className="dgm-s" x="564" y="103">gated to the lead&rsquo;s local business hours</text>
          <line className="dgm-wire" pathLength="1" x1="346" y1="231" x2="388" y2="231" markerEnd="url(#dgm-a)" />
          <text className="dgm-s" x="367" y="192">before dial</text>
        </g>

        <g style={{ "--i": 4 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="394" y="202" width="146" height="58" />
          <text className="dgm-t" x="467" y="226">validate</text>
          <text className="dgm-t" x="467" y="242">phone · fields</text>
        </g>

        <g style={{ "--i": 5 } as React.CSSProperties}>
          <line className="dgm-wire dgm-wire--accent" pathLength="1" x1="467" y1="260" x2="467" y2="330" markerEnd="url(#dgm-b)" />
          <rect className="dgm-box dgm-box--dashed" pathLength="1" x="394" y="336" width="146" height="48" />
          <text className="dgm-s" x="467" y="356">dropped —</text>
          <text className="dgm-s" x="467" y="371">never dialled</text>
          <line className="dgm-wire" pathLength="1" x1="540" y1="231" x2="582" y2="231" markerEnd="url(#dgm-a)" />
          <text className="dgm-f" x="561" y="222">&le;60s</text>
        </g>

        <g style={{ "--i": 6 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="588" y="202" width="146" height="58" />
          <text className="dgm-t" x="661" y="226">voice agent</text>
          <text className="dgm-t" x="661" y="242">VAPI / Retell</text>
        </g>

        <g style={{ "--i": 7 } as React.CSSProperties}>
          <line className="dgm-wire" pathLength="1" x1="661" y1="260" x2="661" y2="304" />
          <line className="dgm-wire" pathLength="1" x1="560" y1="304" x2="950" y2="304" />
          <text className="dgm-s" x="830" y="294">every fact is a live read</text>
        </g>

        <g style={{ "--i": 8 } as React.CSSProperties}>
          <line className="dgm-wire" pathLength="1" x1="596" y1="304" x2="596" y2="392" />
          <line className="dgm-wire" pathLength="1" x1="708" y1="304" x2="708" y2="392" />
          <line className="dgm-wire" pathLength="1" x1="820" y1="304" x2="820" y2="392" />
          <line className="dgm-wire" pathLength="1" x1="923" y1="304" x2="923" y2="392" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="548" y="392" width="96" height="52" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="660" y="392" width="96" height="52" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="772" y="392" width="96" height="52" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="884" y="392" width="78" height="52" />
          <text className="dgm-t" x="596" y="414">timezone</text>
          <text className="dgm-f" x="596" y="430">~250ms</text>
          <text className="dgm-t" x="708" y="414">calendar</text>
          <text className="dgm-s" x="708" y="430">availability</text>
          <text className="dgm-t" x="820" y="414">send SMS</text>
          <text className="dgm-s" x="820" y="430">link · address</text>
          <text className="dgm-t" x="923" y="414">task</text>
          <text className="dgm-s" x="923" y="430">create</text>
          <line className="dgm-wire" pathLength="1" x1="734" y1="231" x2="776" y2="231" markerEnd="url(#dgm-a)" />
          <text className="dgm-s" x="755" y="192">on call</text>
        </g>

        <g style={{ "--i": 9 } as React.CSSProperties}>
          <rect className="dgm-box dgm-box--out" pathLength="1" x="782" y="202" width="200" height="58" />
          <text className="dgm-t dgm-t--out" x="882" y="226">booked</text>
          <text className="dgm-t" x="882" y="242">+ CRM write-back</text>
          <path className="dgm-wire" pathLength="1" d="M734 91 L882 91 L882 196" markerEnd="url(#dgm-a)" fill="none" />
        </g>
      </svg>

      {/* ── narrow: the same pipeline, top to bottom ──────────────────── */}
      <svg className="dgm__narrow" viewBox="0 0 344 700" aria-hidden="true" focusable="false">
        <defs>
          <marker id="dgn-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
          </marker>
          <marker id="dgn-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
          </marker>
        </defs>

        <g style={{ "--i": 0 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="0" y="8" width="196" height="52" />
          <text className="dgm-t" x="98" y="30">Meta lead form</text>
          <text className="dgm-s" x="98" y="46">paid social</text>
        </g>

        <g style={{ "--i": 1 } as React.CSSProperties}>
          <line className="dgm-wire" pathLength="1" x1="98" y1="60" x2="98" y2="82" markerEnd="url(#dgn-a)" />
        </g>

        <g style={{ "--i": 2 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="0" y="88" width="196" height="52" />
          <text className="dgm-t" x="98" y="110">CRM · tag</text>
          <text className="dgm-s" x="98" y="126">pipeline stage</text>
        </g>

        <g style={{ "--i": 3 } as React.CSSProperties}>
          <line className="dgm-wire" pathLength="1" x1="196" y1="114" x2="230" y2="114" markerEnd="url(#dgn-a)" />
          <rect className="dgm-box dgm-box--dashed" pathLength="1" x="236" y="86" width="108" height="56" />
          <text className="dgm-s" x="290" y="105">SMS + email</text>
          <text className="dgm-s" x="290" y="118">nurture, gated</text>
          <text className="dgm-s" x="290" y="131">to lead&rsquo;s hours</text>
          <line className="dgm-wire" pathLength="1" x1="98" y1="140" x2="98" y2="162" markerEnd="url(#dgn-a)" />
        </g>

        <g style={{ "--i": 4 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="0" y="168" width="196" height="52" />
          <text className="dgm-t" x="98" y="190">validate</text>
          <text className="dgm-s" x="98" y="206">phone · fields</text>
        </g>

        <g style={{ "--i": 5 } as React.CSSProperties}>
          <line className="dgm-wire dgm-wire--accent" pathLength="1" x1="196" y1="194" x2="230" y2="194" markerEnd="url(#dgn-b)" />
          <rect className="dgm-box dgm-box--dashed" pathLength="1" x="236" y="172" width="108" height="44" />
          <text className="dgm-s" x="290" y="190">dropped —</text>
          <text className="dgm-s" x="290" y="204">never dialled</text>
          <line className="dgm-wire" pathLength="1" x1="98" y1="220" x2="98" y2="278" markerEnd="url(#dgn-a)" />
          <text className="dgm-f" x="140" y="252">&le;60s</text>
        </g>

        <g style={{ "--i": 6 } as React.CSSProperties}>
          <rect className="dgm-box" pathLength="1" x="0" y="284" width="196" height="52" />
          <text className="dgm-t" x="98" y="306">voice agent</text>
          <text className="dgm-s" x="98" y="322">VAPI / Retell</text>
        </g>

        <g style={{ "--i": 7 } as React.CSSProperties}>
          <line className="dgm-wire" pathLength="1" x1="98" y1="336" x2="98" y2="604" />
          <text className="dgm-s dgm-s--left" x="0" y="352">tool bus — every fact is a live read</text>
        </g>

        <g style={{ "--i": 8 } as React.CSSProperties}>
          <line className="dgm-wire" pathLength="1" x1="98" y1="380" x2="118" y2="380" />
          <line className="dgm-wire" pathLength="1" x1="98" y1="428" x2="118" y2="428" />
          <line className="dgm-wire" pathLength="1" x1="98" y1="476" x2="118" y2="476" />
          <line className="dgm-wire" pathLength="1" x1="98" y1="524" x2="118" y2="524" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="124" y="360" width="220" height="40" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="124" y="408" width="220" height="40" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="124" y="456" width="220" height="40" />
          <rect className="dgm-box dgm-box--quiet" pathLength="1" x="124" y="504" width="220" height="40" />
          <text className="dgm-t dgm-t--left" x="136" y="378">timezone</text>
          <text className="dgm-f dgm-f--left" x="136" y="392">~250ms</text>
          <text className="dgm-t dgm-t--left" x="136" y="426">calendar</text>
          <text className="dgm-s dgm-s--left" x="136" y="440">live availability</text>
          <text className="dgm-t dgm-t--left" x="136" y="474">send SMS</text>
          <text className="dgm-s dgm-s--left" x="136" y="488">address · link</text>
          <text className="dgm-t dgm-t--left" x="136" y="522">task create</text>
          <text className="dgm-s dgm-s--left" x="136" y="536">for the team</text>
        </g>

        <g style={{ "--i": 9 } as React.CSSProperties}>
          <rect className="dgm-box dgm-box--out" pathLength="1" x="0" y="612" width="344" height="56" />
          <text className="dgm-t dgm-t--out" x="172" y="636">booked</text>
          <text className="dgm-s" x="172" y="652">+ CRM write-back</text>
        </g>
      </svg>

      <figcaption>
        Validation before the dial. Every fact from a live read.
      </figcaption>
    </figure>
  );
}
