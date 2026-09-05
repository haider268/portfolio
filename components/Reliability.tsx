import Reveal from "./Reveal";

/* The best material on the site, so it gets a real treatment rather than a
   table dump. Sorting the failures into three tiers is itself the argument:
   what you can make impossible is cheaper than what you have to handle, and
   what you have to handle is cheaper than what a human has to be told about.
   The tier is the finding; the pairs are the evidence. */

type Pair = { fail: string; fix: string };
type Tier = { name: string; gloss: string; pairs: Pair[] };

const TIERS: Tier[] = [
  {
    name: "Prevented",
    gloss: "the failure is made structurally impossible, not merely unlikely",
    pairs: [
      {
        fail: "A bad or missing phone number, or a required field left empty.",
        fix: "Middleware validates before the call is placed. A malformed record is dropped, not burned on a dial that was never going to connect.",
      },
      {
        fail: "The model inventing an open slot, an address, or a price.",
        fix: "It never answers from context. Every fact it states is a live tool or database read taken at the moment it says it.",
      },
      {
        fail: "The wrong timezone, and a phone ringing at two in the morning.",
        fix: "Resolution runs as a tool in roughly 250ms and feeds the booking layer. Calls and messages are gated to the lead’s local business hours, never the client’s.",
      },
      {
        fail: "A lead replies STOP and gets messaged again.",
        fix: "STOP flips do-not-disturb automatically, with CRM-level enforcement behind it so compliance does not rest on one mechanism.",
      },
    ],
  },
  {
    name: "Handled",
    gloss: "it will happen; the system degrades in a way the caller can live with",
    pairs: [
      {
        fail: "The slot is taken by someone else while the call is still running.",
        fix: "Not prevented — handled. The agent says so on the call and offers the nearest alternatives it has just read back from the calendar.",
      },
      {
        fail: "Voicemail picks up and answers convincingly enough to be mistaken for a person.",
        fix: "Platform voicemail detection, plus greeting-pattern detection at the prompt level for the cases the platform misses.",
      },
      {
        fail: "Speech recognition mishears a name or an email address.",
        fix: "Word-for-word readback, but only where a required field would otherwise be stored wrong. Everywhere else a light confirmation keeps the turn moving.",
      },
    ],
  },
  {
    name: "Escalated",
    gloss: "nobody finds out from the client",
    pairs: [
      {
        fail: "A workflow errors partway through.",
        fix: "Automatic team notification. There are no silent failures anywhere in the path.",
      },
      {
        fail: "A provider goes down.",
        fix: "Detected and escalated by automatic task creation, so the team hears it from the system first.",
      },
    ],
  },
];

export default function Reliability() {
  return (
    <div className="tiers">
      {TIERS.map((tier) => (
        <section className="tier spread" key={tier.name} aria-labelledby={`tier-${tier.name}`}>
          <div className="note tier__head">
            <b id={`tier-${tier.name}`}>{tier.name}</b>
            {tier.gloss}
          </div>
          <dl className="body pairs">
            {tier.pairs.map((p, i) => (
              <Reveal key={p.fail} className="pair" delay={i * 70}>
                <dt className="pair__fail">{p.fail}</dt>
                <dd className="pair__fix">{p.fix}</dd>
              </Reveal>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
