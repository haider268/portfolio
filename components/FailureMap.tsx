"use client";

import { useState } from "react";

/* The failure catalogue as a map, not a table.

   Fourteen production failure modes. Select one; see what happened, the
   mechanical response, and the principle it left behind. Every entry comes
   from the profile document — none are invented, and none are softened.

   Plain buttons and a described panel: fully keyboard-driven, screen-reader
   legible, no canvas anywhere. */

type Failure = {
  id: string;
  label: string;
  fail: string;
  fix: string;
};

type Tier = {
  name: string;
  principle: string;
  items: Failure[];
};

const TIERS: Tier[] = [
  {
    name: "Prevented",
    principle: "Made structurally impossible, not merely unlikely.",
    items: [
      {
        id: "bad-record",
        label: "bad record",
        fail: "A lead arrives with a bad or missing phone number, or a required field left empty.",
        fix: "Middleware validates before the call is placed. A malformed record is dropped, not burned on a dial that was never going to connect.",
      },
      {
        id: "invented-facts",
        label: "invented facts",
        fail: "The model invents an open slot, an address, or a price.",
        fix: "It never answers from context. Every fact it states — availability, address, price, policy — is a live tool or database read taken at the moment it speaks.",
      },
      {
        id: "wrong-timezone",
        label: "wrong timezone",
        fail: "The wrong timezone, and a phone ringing at two in the morning.",
        fix: "A ~250ms resolution tool feeds the booking layer. Calls and messages are gated to the lead's local business hours — never the client's.",
      },
      {
        id: "sms-stop",
        label: "SMS compliance",
        fail: "A lead replies STOP and gets messaged again.",
        fix: "STOP flips do-not-disturb automatically, with CRM-level enforcement as the backstop.",
      },
    ],
  },
  {
    name: "Handled",
    principle: "You cannot win a distributed race; you can only degrade well.",
    items: [
      {
        id: "slot-taken",
        label: "slot taken mid-call",
        fail: "Someone else takes the slot while the call is still running.",
        fix: "Not prevented — handled. The agent says so on the call and offers the nearest alternatives it has just read from the calendar.",
      },
      {
        id: "voicemail",
        label: "voicemail as human",
        fail: "Voicemail picks up and answers convincingly enough to be mistaken for a person.",
        fix: "Platform voicemail detection, plus greeting-pattern detection at the prompt level for what the platform misses.",
      },
      {
        id: "stt-mishear",
        label: "misheard name",
        fail: "Speech recognition mishears a name or an email address.",
        fix: "Word-for-word readback, but only where a required field would otherwise be stored wrong. Elsewhere a light confirmation keeps the turn moving.",
      },
    ],
  },
  {
    name: "Escalated",
    principle: "No silent failures anywhere in the path.",
    items: [
      {
        id: "workflow-error",
        label: "workflow error",
        fail: "A workflow errors partway through.",
        fix: "Automatic team notification. Nothing fails silently.",
      },
      {
        id: "provider-outage",
        label: "provider outage",
        fail: "A provider goes down.",
        fix: "Detected and escalated by automatic task creation, so the team hears it from the system first.",
      },
    ],
  },
  {
    name: "In the speech loop",
    principle: "The turn budget is set by human speech, not by what the API returns.",
    items: [
      {
        id: "gps-drift",
        label: "phantom guidance",
        fail: "Indoor GPS drift past 15 metres produced contradictory turn instructions.",
        fix: "A location confidence gate: past a 15m accuracy radius the agent stops giving vector distances and switches to landmark guidance — “near Block B” instead of “in 40 metres”.",
      },
      {
        id: "false-barge-in",
        label: "false barge-in",
        fail: "A cough or throat-clear fired a false barge-in and cut the agent off.",
        fix: "Barge-in now requires over 250ms of continuous voice energy plus spectral speech verification before a CLEAR_BUFFER event fires.",
      },
      {
        id: "echo-loop",
        label: "echo loop",
        fail: "Speaker audio bled into the mic and the agent transcribed itself.",
        fix: "Server-side acoustic echo cancellation, plus an output mute gate on the STT pipeline while TTS is playing.",
      },
      {
        id: "target-switch",
        label: "mid-sentence switch",
        fail: "“Take me to Block B… actually, the library.”",
        fix: "A streaming intent parser invalidates the previous tool result the moment a new spatial entity appears — a soft context reset that keeps the rest of the conversation state.",
      },
      {
        id: "syntax-leak",
        label: "syntax leak",
        fail: "Raw JSON and markdown reached the TTS engine.",
        fix: "Streaming regex middleware sanitises tokens before they reach synthesis, so tool syntax can never be read aloud.",
      },
    ],
  },
];

const ALL = TIERS.flatMap((t) => t.items.map((i) => ({ ...i, tier: t })));

export default function FailureMap() {
  const [selected, setSelected] = useState(ALL[0].id);
  const current = ALL.find((i) => i.id === selected) ?? ALL[0];

  return (
    <div className="fmap">
      <div className="fmap__nodes">
        {TIERS.map((tier) => (
          <div className="fmap__tier" key={tier.name}>
            <p className="fmap__tierName">{tier.name}</p>
            <div className="fmap__list" role="group" aria-label={`${tier.name} failures`}>
              {tier.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="fmap__node"
                  aria-pressed={item.id === selected}
                  onClick={() => setSelected(item.id)}
                >
                  <span className="fmap__pip" aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fmap__panel" aria-live="polite">
        <p className="fmap__panelTier">{current.tier.name}</p>
        <h3 className="fmap__panelTitle">{current.label}</h3>
        <div className="fmap__block">
          <p className="fmap__blockLabel">what happened</p>
          <p className="fmap__blockText">{current.fail}</p>
        </div>
        <div className="fmap__block">
          <p className="fmap__blockLabel">mechanical response</p>
          <p className="fmap__blockText">{current.fix}</p>
        </div>
        <div className="fmap__block">
          <p className="fmap__blockLabel">principle</p>
          <p className="fmap__blockText fmap__blockText--principle">{current.tier.principle}</p>
        </div>
      </div>
    </div>
  );
}
