"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* The agent panel.

   Speech recognition and synthesis run here in the browser, so the server only
   moves text. Tool calls render as they fire — a visitor is not reading about
   tool-grounded answering, they are watching it happen.

   Text input is always present. Firefox has no speech recognition and Safari's
   is unreliable, so a mic-only panel is a dead button for a lot of people. */

type ToolItem = { kind: "tool"; name: string; args: Record<string, unknown>; ok: boolean };
type DraftItem = { kind: "draft"; href: string; reference?: string };
type SaidItem = { kind: "said"; who: "you" | "agent"; text: string };
type NoteItem = { kind: "note"; text: string };
type Item = ToolItem | DraftItem | SaidItem | NoteItem;

type Status = "ready" | "listening" | "thinking" | "speaking" | "ended";

const OPENERS = [
  "What have you built?",
  "How does the timezone engine work?",
  "What breaks in production?",
];

const CLOSING = "Thanks for stopping by. Email haiderali2689832@gmail.com any time.";

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
  const [status, setStatus] = useState<Status>("ready");
  const [draft, setDraft] = useState("");
  const [sttReady, setSttReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const speechOn = useRef(false);
  const history = useRef<{ role: "user" | "model"; text: string }[]>([]);
  const recognition = useRef<Recognition | null>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (Ctor) {
      const r = new Ctor();
      r.lang = "en-US";
      r.interimResults = false;
      r.continuous = false;
      recognition.current = r;
      setSttReady(true);
    }
    speechOn.current = "speechSynthesis" in window;
    return () => {
      if (speechOn.current) window.speechSynthesis.cancel();
    };
  }, []);

  const push = useCallback((item: Item) => setItems((prev) => [...prev, item]), []);

  const speak = useCallback((text: string) => {
    if (!speechOn.current) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.04;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy || status === "ended") return;

      setBusy(true);
      setDraft("");
      push({ kind: "said", who: "you", text: clean });
      setStatus("thinking");
      let reply = "";
      let capped = false;

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
              push({ kind: "tool", name: ev.name, args: ev.args ?? {}, ok: ev.ok });
              if (ev.send_url) push({ kind: "draft", href: ev.send_url, reference: ev.reference });
            } else if (ev.type === "chunk") {
              if (status !== "speaking") setStatus("speaking");
              reply = reply ? `${reply} ${ev.text}` : ev.text;
              speak(ev.text);
            } else if (ev.type === "limited") {
              // the cap exists to stop one visitor exhausting a free-tier quota
              // for everyone else; it is never explained to the visitor
              capped = true;
            }
          }
        }

        if (reply) {
          push({ kind: "said", who: "agent", text: reply });
          history.current = [
            ...history.current,
            { role: "user" as const, text: clean },
            { role: "model" as const, text: reply },
          ].slice(-24);
        }
      } catch {
        push({
          kind: "note",
          text: "That did not go through. Everything I know is on these pages, and email reaches me directly.",
        });
      } finally {
        setBusy(false);
        setStatus(capped ? "ended" : "ready");
      }
    },
    [busy, push, speak, status]
  );

  function listen() {
    const r = recognition.current;
    if (!r || busy || status === "ended") return;
    setStatus("listening");
    r.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      if (said) void send(said);
    };
    r.onerror = () => setStatus("ready");
    r.onend = () => setStatus((s) => (s === "listening" ? "ready" : s));
    try {
      r.start();
    } catch {
      setStatus("ready");
    }
  }

  function end() {
    recognition.current?.stop();
    if (speechOn.current) window.speechSynthesis.cancel();
    history.current = [];
    setBusy(false);
    setStatus("ended");
    push({ kind: "note", text: CLOSING });
  }

  function restart() {
    history.current = [];
    setItems([]);
    setStatus("ready");
  }

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const live = status === "listening" || status === "thinking" || status === "speaking";

  return (
    <div className="agent" data-status={status}>
      <div className="agent__bar">
        <span className="agent__live" aria-hidden="true" />
        <span className="agent__who">Agent</span>
        {status !== "ended" ? (
          <button className="agent__end" type="button" onClick={end} disabled={!items.length && !live}>
            End
          </button>
        ) : (
          <button className="agent__end" type="button" onClick={restart}>
            Start again
          </button>
        )}
      </div>

      <div className="agent__log" ref={log} role="log" aria-live="polite" aria-label="Conversation">
        {items.length === 0 && (
          <p className="agent__empty">
            Ask me anything about the work. I search these pages and answer from
            what I find.
          </p>
        )}
        {items.map((it, i) =>
          it.kind === "tool" ? (
            <p className="agent__tool" key={i}>
              <span className="agent__toolName">{it.name}</span>
              <span className="agent__toolArgs">({fmtArgs(it.args)})</span>
              {!it.ok && <span className="agent__toolErr">error</span>}
            </p>
          ) : it.kind === "draft" ? (
            <p className="agent__draft" key={i}>
              <a href={it.href}>Open the draft in your mail client</a>
              {it.reference && <span className="agent__ref">{it.reference}</span>}
            </p>
          ) : it.kind === "note" ? (
            <p className="agent__note" key={i}>
              {it.text}
            </p>
          ) : (
            <p className={`agent__said agent__said--${it.who}`} key={i}>
              <span className="agent__label">{it.who === "you" ? "You" : "Agent"}</span>
              <span>{it.text}</span>
            </p>
          )
        )}
      </div>

      {status !== "ended" && (
        <>
          <form
            className="agent__form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <input
              className="agent__input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a question"
              aria-label="Ask a question"
              maxLength={600}
              disabled={busy}
            />
            {sttReady && (
              <button
                className="agent__mic"
                type="button"
                onClick={listen}
                disabled={busy}
                aria-label="Ask by voice"
              >
                {status === "listening" ? "Listening" : "Speak"}
              </button>
            )}
            <button className="agent__send" type="submit" disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>

          {items.length === 0 && (
            <p className="agent__openers">
              {OPENERS.map((q) => (
                <button key={q} type="button" onClick={() => void send(q)} disabled={busy}>
                  {q}
                </button>
              ))}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function fmtArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${truncate(v)}"` : JSON.stringify(v)}`)
    .join(", ");
}

function truncate(s: string, n = 40): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
