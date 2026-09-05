"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* The live agent.

   Speech recognition and synthesis run here, in the browser, and the server
   only ever moves text — which is what makes this free to host and also what
   makes it slower than the production path. The tradeoff is stated on the page
   rather than hidden.

   Tool calls are rendered as they fire. That is the point of the whole thing:
   a visitor is not reading a description of tool-grounded answering, they are
   watching search_experience run and then hearing the answer that came out of
   it.

   Text input is always present. Firefox has no speech recognition at all and
   Safari's is unreliable, so a mic-only demo is a dead button for a large
   share of visitors. */

type ToolEvent = { kind: "tool"; name: string; args: Record<string, unknown>; ok: boolean; ms: number };
type DraftEvent = { kind: "draft"; href: string; reference?: string };
type SaidEvent = { kind: "said"; who: "you" | "agent"; text: string };
type NoteEvent = { kind: "note"; text: string };
type Item = ToolEvent | SaidEvent | NoteEvent | DraftEvent;

type Status = "idle" | "listening" | "thinking" | "speaking";

const OPENERS = [
  "What did he actually build?",
  "How does the timezone thing work?",
  "Which résumé fits a voice AI role?",
  "What breaks in production?",
];

// minimal shape of the vendor-prefixed Web Speech API
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export default function VoiceDemo() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [draft, setDraft] = useState("");
  const [speechOn, setSpeechOn] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const history = useRef<{ role: "user" | "model"; text: string }[]>([]);
  const recognition = useRef<Recognition | null>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (Ctor) {
      const r = new Ctor();
      r.lang = "en-US";
      r.interimResults = false;
      r.continuous = false;
      recognition.current = r;
      setSttReady(true);
    }
    setSpeechOn(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const push = useCallback((item: Item) => setItems((prev) => [...prev, item]), []);

  const speak = useCallback(
    (text: string) => {
      if (!speechOn) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.04;
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    },
    [speechOn]
  );

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy) return;

      setBusy(true);
      setDraft("");
      push({ kind: "said", who: "you", text: clean });
      setStatus("thinking");
      const t0 = performance.now();
      let measured = false;
      let reply = "";

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: clean, history: history.current }),
        });
        if (!res.ok || !res.body) throw new Error(`request failed (${res.status})`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const ev = JSON.parse(line.slice(6));

            if (ev.type === "tool") {
              push({ kind: "tool", name: ev.name, args: ev.args ?? {}, ok: ev.ok, ms: ev.ms });
              // nothing is sent for you: if the tool drafted a message, the
              // visitor gets the actual link rather than an instruction
              if (ev.send_url) push({ kind: "draft", href: ev.send_url, reference: ev.reference });
            } else if (ev.type === "chunk") {
              if (!measured) {
                measured = true;
                setLatencies((l) => [...l, performance.now() - t0]);
                setStatus("speaking");
              }
              reply = reply ? `${reply} ${ev.text}` : ev.text;
              speak(ev.text);
            } else if (ev.type === "degraded") {
              push({ kind: "note", text: "Upstream call failed — falling back to a direct search of the site." });
            } else if (ev.type === "limited") {
              push({ kind: "note", text: "Demo ceiling reached." });
            }
          }
        }

        if (reply) {
          push({ kind: "said", who: "agent", text: reply });
          history.current = [
            ...history.current,
            { role: "user" as const, text: clean },
            { role: "model" as const, text: reply },
          ].slice(-12);
        }
      } catch {
        push({
          kind: "note",
          text: "The request did not complete. Everything the agent knows is on these pages, and email reaches Haider directly.",
        });
      } finally {
        setBusy(false);
        setStatus("idle");
      }
    },
    [busy, push, speak]
  );

  function listen() {
    const r = recognition.current;
    if (!r || busy) return;
    setStatus("listening");
    r.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      if (said) void send(said);
    };
    r.onerror = () => setStatus("idle");
    r.onend = () => setStatus((s) => (s === "listening" ? "idle" : s));
    try {
      r.start();
    } catch {
      setStatus("idle");
    }
  }

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const p50 = median(latencies);

  return (
    <div className="agent">
      <div className="agent__bar">
        <span className="label">Status</span>
        <span className="agent__status" data-status={status}>
          {status}
        </span>
        <span className="agent__stat">
          <span className="label">Turns</span>
          <b>{latencies.length}</b>
        </span>
        <span className="agent__stat">
          <span className="label">p50 this session</span>
          <b>{p50 === null ? "—" : `${Math.round(p50)}ms`}</b>
        </span>
      </div>

      <div className="agent__log" ref={log} role="log" aria-live="polite" aria-label="Conversation">
        {items.length === 0 && (
          <p className="agent__empty">
            Ask it something. It will search the site, show you the search, and
            answer from what it found.
          </p>
        )}
        {items.map((it, i) =>
          it.kind === "tool" ? (
            <p className="agent__tool" key={i}>
              <span className="agent__toolName">{it.name}</span>
              <span className="agent__toolArgs">({fmtArgs(it.args)})</span>
              <span className="agent__toolMs">
                {it.ok ? "ok" : "error"} · {it.ms}ms
              </span>
            </p>
          ) : it.kind === "draft" ? (
            <p className="agent__draft" key={i}>
              <a href={it.href}>Open the draft in your mail client →</a>
              {it.reference && <span className="agent__ref">{it.reference}</span>}
              <span className="agent__drafts">Nothing is sent until you press send.</span>
            </p>
          ) : it.kind === "note" ? (
            <p className="agent__note" key={i}>
              {it.text}
            </p>
          ) : (
            <p className={`agent__said agent__said--${it.who}`} key={i}>
              <span className="label">{it.who === "you" ? "You" : "Agent"}</span>
              <span>{it.text}</span>
            </p>
          )
        )}
      </div>

      <form
        className="agent__form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <label className="agent__field">
          <span className="label">Ask</span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a question"
            maxLength={600}
            disabled={busy}
          />
        </label>
        <button className="agent__btn" type="submit" disabled={busy || !draft.trim()}>
          Send
        </button>
        {sttReady && (
          <button
            className="agent__btn agent__btn--mic"
            type="button"
            onClick={listen}
            disabled={busy}
            aria-label="Ask by voice"
          >
            {status === "listening" ? "Listening…" : "Speak"}
          </button>
        )}
      </form>

      <p className="agent__openers">
        {OPENERS.map((q) => (
          <button key={q} type="button" onClick={() => void send(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </p>

      {!sttReady && (
        <p className="agent__fallback">
          This browser has no speech recognition — Firefox has none and Safari’s
          is unreliable — so the demo is text only here. That is roughly a third
          of visitors, which is why the text path is not an afterthought.
        </p>
      )}
    </div>
  );
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

function fmtArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${truncate(v)}"` : JSON.stringify(v)}`)
    .join(", ");
}

function truncate(s: string, n = 42): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
