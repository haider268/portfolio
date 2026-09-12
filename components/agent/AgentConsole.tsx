"use client";

import { useEffect, useRef } from "react";
import { useAgent } from "./useAgent";

/* The console.

   Not a chat widget: a control surface for the system behind the site. The
   status row speaks in the same verbs the scene pulses to, and every line
   in the event feed is a real backend event — tool calls render as they
   fire, before the answer exists.

   Typing is a first-class path, not a fallback: Firefox and Safari get the
   same console with the mic control simply absent. */

const OPENERS = [
  "What have you built?",
  "How does the timezone engine work?",
  "What breaks in production?",
];

const STATUS_WORD: Record<string, string> = {
  idle: "standing by",
  listening: "listening",
  thinking: "processing",
  tool: "working",
  speaking: "responding",
  ended: "session closed",
};

export default function AgentConsole() {
  const a = useAgent();
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [a.feed, a.streaming]);

  if (!a.live) {
    return (
      <div className="console console--closed">
        <button type="button" className="begin" onClick={a.begin}>
          <span className="begin__ring" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30.5" className="begin__orbit" />
              <circle cx="32" cy="32" r="3.2" className="begin__dot" />
            </svg>
          </span>
          <span className="begin__label">Talk to the system</span>
          <span className="begin__hint">voice or text · it answers from these pages</span>
        </button>
      </div>
    );
  }

  const active = a.phase !== "idle" && a.phase !== "ended";

  return (
    <div className="console" data-phase={a.phase}>
      <div className="console__status">
        <span className="console__pip" aria-hidden="true" />
        <span className="console__word">{STATUS_WORD[a.phase]}</span>

        {/* the current turn's real tool chain, in firing order */}
        {a.chain.length > 0 && (
          <span className="console__chain" aria-hidden="true">
            {a.chain.map((t) => (
              <span key={t.id} className="console__chainStep" data-ok={t.ok}>
                {t.verb}
                {t.detail && <i>{t.detail}</i>}
              </span>
            ))}
          </span>
        )}

        {a.phase !== "ended" ? (
          <button
            type="button"
            className="endcall"
            onClick={a.end}
            aria-label="End the session"
          >
            <svg viewBox="0 0 44 44" fill="none" aria-hidden="true">
              <circle cx="22" cy="22" r="20.5" className="endcall__ring" />
              <rect x="16.5" y="16.5" width="11" height="11" rx="1.5" className="endcall__mark" />
            </svg>
            <span>end</span>
          </button>
        ) : (
          <button type="button" className="endcall endcall--again" onClick={a.restart}>
            <span>start again</span>
          </button>
        )}
      </div>

      <div
        className="console__feed"
        ref={log}
        role="log"
        aria-live="polite"
        aria-label="Session"
      >
        {a.feed.length === 0 && !a.streaming && (
          <p className="console__empty">
            Ask about the work. It searches these pages and answers only from
            what it finds — you will see each step as it runs.
          </p>
        )}

        {a.feed.map((it, i) =>
          it.kind === "tool" ? (
            <p className="feed__tool" key={i} data-ok={it.ok}>
              <span className="feed__verb">{it.verb}</span>
              {it.detail && <span className="feed__detail">{it.detail}</span>}
              {!it.ok && <span className="feed__err">failed</span>}
            </p>
          ) : it.kind === "draft" ? (
            <p className="feed__draft" key={i}>
              <a href={it.href}>Open the drafted message</a>
              {it.reference && <span className="feed__ref">{it.reference}</span>}
            </p>
          ) : it.kind === "note" ? (
            <p className="feed__note" key={i}>{it.text}</p>
          ) : (
            <p className={`feed__said feed__said--${it.kind}`} key={i}>
              <span className="feed__who">{it.kind === "you" ? "you" : "agent"}</span>
              <span className="feed__text">{it.text}</span>
            </p>
          )
        )}

        {/* the reply as it streams, before it lands in the feed */}
        {a.streaming && (
          <p className="feed__said feed__said--agent feed__said--streaming">
            <span className="feed__who">agent</span>
            <span className="feed__text">{a.streaming}</span>
          </p>
        )}
      </div>

      {a.phase !== "ended" && (
        <>
          <form
            className="console__form"
            onSubmit={(e) => {
              e.preventDefault();
              void a.send(a.draft);
            }}
          >
            <input
              className="console__input"
              type="text"
              value={a.draft}
              onChange={(e) => a.setDraft(e.target.value)}
              placeholder="Ask about the work"
              aria-label="Ask a question"
              maxLength={600}
              disabled={a.busy}
            />
            {a.sttReady && (
              <button
                type="button"
                className="console__mic"
                onClick={a.listen}
                disabled={a.busy}
                aria-label="Ask by voice"
                data-listening={a.phase === "listening"}
              >
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" className="mic__body" />
                  <path d="M3 8a5 5 0 0 0 10 0M8 13v2" className="mic__stand" />
                </svg>
              </button>
            )}
            <button
              className="console__send"
              type="submit"
              disabled={a.busy || !a.draft.trim()}
            >
              send
            </button>
          </form>

          {a.feed.length === 0 && !active && (
            <div className="console__openers">
              {OPENERS.map((q) => (
                <button key={q} type="button" onClick={() => void a.send(q)} disabled={a.busy}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
