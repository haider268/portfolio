import Reveal from "./Reveal";

/* Nine failures that have happened in production, sorted by what each costs
   to live with. */

type Pair = { fail: string; fix: string };
type Tier = { name: string; gloss: string; pairs: Pair[] };

const TIERS: Tier[] = [
  {
    name: "Prevented",
    gloss: "cannot happen",
    pairs: [
      {
        fail: "A bad or missing phone number, or a required field left empty.",
        fix: "Middleware validates before the call is placed. A malformed record is dropped, not burned on a dial that was never going to connect.",
      },
      {
        fail: "The model inventing an open slot, an address, or a price.",
        fix: "It never answers from context. Every fact it states is a live read taken at the moment it says it.",
      },
      {
        fail: "The wrong timezone, and a phone ringing at two in the morning.",
        fix: "Resolution runs as a tool in roughly 250ms and feeds the booking layer. Calls and messages are gated to the lead’s local hours, never the client’s.",
      },
      {
        fail: "A lead replies STOP and gets messaged again.",
        fix: "STOP flips do-not-disturb automatically, with CRM-level enforcement behind it.",
      },
    ],
  },
  {
    name: "Handled",
    gloss: "will happen; degrades well",
    pairs: [
      {
        fail: "The slot is taken by someone else while the call is still running.",
        fix: "The agent says so on the call and offers the nearest alternatives it has just read from the calendar.",
      },
      {
        fail: "Voicemail picks up and answers convincingly enough to be mistaken for a person.",
        fix: "Platform voicemail detection, plus greeting-pattern detection at the prompt level for what the platform misses.",
      },
      {
        fail: "Speech recognition mishears a name or an email address.",
        fix: "Word-for-word readback, but only where a required field would otherwise be stored wrong. Elsewhere a light confirmation keeps the turn moving.",
      },
    ],
  },
  {
    name: "Escalated",
    gloss: "a human is told",
    pairs: [
      {
        fail: "A workflow errors partway through.",
        fix: "Automatic team notification. No silent failures anywhere in the path.",
      },
      {
        fail: "A provider goes down.",
        fix: "Detected and escalated by automatic task creation, so the team hears it from the system first.",
      },
    ],
  },
];

export default function FailureTiers() {
  return (
    <div className="tiers">
      {TIERS.map((tier) => (
        <section className="tier" key={tier.name} aria-labelledby={`tier-${tier.name}`}>
          <p className="tier__head">
            <b id={`tier-${tier.name}`}>{tier.name}</b>
            <span>{tier.gloss}</span>
          </p>
          <dl className="pairs">
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
