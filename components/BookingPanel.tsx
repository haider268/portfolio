"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTACT } from "@/lib/contact";

/* Booking by hand: the same calendar, caps and idempotent write the agent
   uses — this is just the second front door. Real availability rendered in
   the visitor's own timezone, a three-field form, and the invitation goes
   to both inboxes.

   Every state is designed: loading, no calendar, no slots, a slot vanishing
   mid-form, the daily cap, and success. */

type SlotView = { slot_id: string; their_time: string; host_time: string };

type Phase =
  | { kind: "loading" }
  | { kind: "off" }                       // calendar not connected / unreachable
  | { kind: "empty" }                     // connected, nothing open
  | { kind: "picking"; slots: SlotView[] }
  | { kind: "booking"; slots: SlotView[] }
  | { kind: "booked"; their: string; duplicate: boolean };

export default function BookingPanel() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  const load = useCallback(async () => {
    setPhase({ kind: "loading" });
    setSelected(null);
    try {
      const res = await fetch(`/api/book?tz=${encodeURIComponent(tz)}`);
      const json = (await res.json()) as { ready: boolean; slots?: SlotView[] };
      if (!json.ready) setPhase({ kind: "off" });
      else if (!json.slots?.length) setPhase({ kind: "empty" });
      else setPhase({ kind: "picking", slots: json.slots });
    } catch {
      setPhase({ kind: "off" });
    }
  }, [tz]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase.kind !== "picking" || !selected) return;
    setProblem(null);
    setPhase({ kind: "booking", slots: phase.slots });

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, topic, slot_id: selected, tz }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        code?: string;
        their_time?: string;
        duplicate?: boolean;
      };
      if (json.ok && json.their_time) {
        setPhase({ kind: "booked", their: json.their_time, duplicate: !!json.duplicate });
        return;
      }
      setProblem(
        json.code === "TAKEN"
          ? "That slot went to someone else while you were typing — pick another."
          : json.code === "BAD_EMAIL"
          ? "That email address does not look right — the invitation goes there."
          : json.code === "LIMIT"
          ? `Booking is capped for now — email ${CONTACT.email} instead.`
          : "The booking did not go through — try again, or use email."
      );
      // a taken slot means the list is stale; re-read it
      if (json.code === "TAKEN") void load();
      else setPhase({ kind: "picking", slots: phase.slots });
    } catch {
      setProblem("The booking did not go through — try again, or use email.");
      setPhase({ kind: "picking", slots: phase.slots });
    }
  }

  if (phase.kind === "off") {
    return (
      <p className="booking__off">
        The calendar is not taking bookings right now — email{" "}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and I will reply
        with times.
      </p>
    );
  }

  if (phase.kind === "booked") {
    return (
      <div className="booking__done" role="status">
        <p className="booking__doneTitle">
          {phase.duplicate ? "You already had this one." : "Booked."}
        </p>
        <p className="booking__doneWhen">{phase.their}</p>
        <p className="booking__doneNote">
          The calendar invitation is on its way to your inbox — we both get
          one. Need to change it? Reply to the invite or email{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="booking" onSubmit={submit} aria-busy={phase.kind === "loading" || phase.kind === "booking"}>
      <p className="booking__lead">
        Real availability, on your clock{tz ? ` (${tz.replace("_", " ")})` : ""}.
        Pick a slot; the invitation lands in both inboxes.
      </p>

      {phase.kind === "loading" && <p className="booking__wait">Reading the calendar…</p>}

      {phase.kind === "empty" && (
        <p className="booking__off">
          Nothing open in the next few days — email{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and I will
          find a time.
        </p>
      )}

      {(phase.kind === "picking" || phase.kind === "booking") && (
        <>
          <div className="booking__slots" role="radiogroup" aria-label="Open slots, in your timezone">
            {phase.slots.map((s) => (
              <button
                key={s.slot_id}
                type="button"
                role="radio"
                aria-checked={selected === s.slot_id}
                className="booking__slot"
                onClick={() => setSelected(s.slot_id)}
                disabled={phase.kind === "booking"}
              >
                {s.their_time}
              </button>
            ))}
          </div>

          <div className="booking__fields">
            <label className="booking__field">
              <span>name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                required
                disabled={phase.kind === "booking"}
              />
            </label>
            <label className="booking__field">
              <span>email — the invite goes here</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={120}
                required
                disabled={phase.kind === "booking"}
              />
            </label>
            <label className="booking__field booking__field--wide">
              <span>what it&rsquo;s about — one line</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={200}
                required
                disabled={phase.kind === "booking"}
              />
            </label>
          </div>

          {problem && (
            <p className="booking__problem" role="alert">
              {problem}
            </p>
          )}

          <button
            className="booking__go"
            type="submit"
            disabled={phase.kind === "booking" || !selected || !name.trim() || !email.trim() || !topic.trim()}
          >
            {phase.kind === "booking" ? "booking…" : "book it →"}
          </button>
        </>
      )}
    </form>
  );
}
