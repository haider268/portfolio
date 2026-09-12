"use client";

import { useEffect, useRef, useState } from "react";
import { useAgent } from "./useAgent";

/* THE DOCK.

   Not a chat panel: a command strip across the foot of the site, present
   on every page, so the agent can carry a visitor through the whole site —
   when it opens a page for them mid-sentence, the conversation and the
   voice continue across the navigation, because this component never
   unmounts.

   The agent speaks first. Its words render like captions over the scene;
   the tool chain runs above them as the real events fire; the full
   transcript sits one keystroke away in the session log. */

const STATUS_WORD: Record<string, string> = {
  idle: "standing by",
  listening: "listening",
  thinking: "processing",
  tool: "working",
  speaking: "responding",
  ended: "session closed",
};

const OPENERS = [
  "What have you built?",
  "Take me to the timezone engine",
  "What breaks in production?",
];

export default function AgentDock() {
  const a = useAgent();
  const [logOpen, setLogOpen] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logOpen) log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [a.feed, logOpen]);

  useEffect(() => {
    if (a.live) input.current?.focus();
  }, [a.live]);

  /* what the captions show: the streaming reply, else the last exchange */
  const lastAgent = [...a.feed].reverse().find((f) => f.kind === "agent" || f.kind === "note");
  const lastYou = [...a.feed].reverse().find((f) => f.kind === "you");
  const caption = a.streaming || (lastAgent ? lastAgent.text : "");
  const lastDraft = [...a.feed].reverse().find((f) => f.kind === "draft");
  const showDraft = lastDraft && a.feed.indexOf(lastDraft) > (lastAgent ? a.feed.indexOf(lastAgent) : -1) - 2;

  if (!a.live) {
    return (
      <div className="dock dock--closed">
        <button type="button" className="summon" onClick={a.begin}>
          <span className="summon__ring" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18.5" className="summon__orbit" />
              <circle cx="20" cy="20" r="2.6" className="summon__dot" />
            </svg>
          </span>
          <span className="summon__label">Talk to the system</span>
        </button>
      </div>
    );
  }

  return (
    <div className="dock" data-phase={a.phase}>
      <div className="dock__veil" aria-hidden="true" />

      <div className="dock__inner">
        {/* real tool chain of the current turn */}
        <div className="dock__chain" aria-hidden="true">
          {a.chain.map((t) => (
            <span key={t.id} className="dock__step" data-ok={t.ok}>
              {t.verb}
              {t.detail && <i>{t.detail}</i>}
            </span>
          ))}
        </div>

        {/* captions */}
        <div className="dock__captions" aria-live="polite">
          {lastYou && !a.streaming && a.phase !== "idle" && a.phase !== "ended" && (
            <p className="dock__you">{lastYou.text}</p>
          )}
          {caption ? (
            <p className="dock__caption" data-streaming={!!a.streaming || undefined}>
              {caption}
            </p>
          ) : (
            <p className="dock__caption dock__caption--empty">
              Ask about the work — or tell me where to go.
            </p>
          )}
          {showDraft && lastDraft?.kind === "draft" && (
            <p className="dock__draft">
              <a href={lastDraft.href}>Open the drafted message</a>
              {lastDraft.reference && <span>{lastDraft.reference}</span>}
            </p>
          )}
        </div>

        {/* openers, until the first exchange */}
        {a.feed.filter((f) => f.kind === "you").length === 0 && a.phase !== "ended" && (
          <div className="dock__openers">
            {OPENERS.map((q) => (
              <button key={q} type="button" onClick={() => void a.send(q)} disabled={a.busy}>
                {q}
              </button>
            ))}
          </div>
        )}

        {/* the command line */}
        {a.phase !== "ended" ? (
          <form
            className="dock__line"
            onSubmit={(e) => {
              e.preventDefault();
              void a.send(a.draft);
            }}
          >
            <span className="dock__pip" aria-hidden="true" />
            <span className="dock__word">{STATUS_WORD[a.phase]}</span>
            <input
              ref={input}
              className="dock__input"
              type="text"
              value={a.draft}
              onChange={(e) => a.setDraft(e.target.value)}
              placeholder="Ask, or say where to go"
              aria-label="Ask the agent"
              maxLength={600}
              disabled={a.busy}
            />
            {a.sttReady && (
              <button
                type="button"
                className="dock__mic"
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
            <button className="dock__send" type="submit" disabled={a.busy || !a.draft.trim()}>
              send
            </button>
            <button
              type="button"
              className="dock__log"
              onClick={() => setLogOpen((v) => !v)}
              aria-expanded={logOpen}
              aria-label="Session log"
            >
              log
            </button>
            <button type="button" className="dock__end" onClick={a.end} aria-label="End the session">
              <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <circle cx="18" cy="18" r="16.5" className="dock__endRing" />
                <rect x="13.5" y="13.5" width="9" height="9" rx="1.2" className="dock__endMark" />
              </svg>
            </button>
          </form>
        ) : (
          <div className="dock__line dock__line--ended">
            <span className="dock__pip" aria-hidden="true" />
            <span className="dock__word">session closed</span>
            <button type="button" className="dock__send" onClick={a.restart}>
              start again
            </button>
            <button
              type="button"
              className="dock__log"
              onClick={() => setLogOpen((v) => !v)}
              aria-expanded={logOpen}
            >
              log
            </button>
          </div>
        )}
      </div>

      {/* the full transcript, one keystroke away */}
      {logOpen && (
        <div className="dock__logPanel" ref={log} role="log" aria-label="Session transcript">
          {a.feed.length === 0 && <p className="dock__logEmpty">Nothing yet.</p>}
          {a.feed.map((it, i) =>
            it.kind === "tool" ? (
              <p className="dock__logTool" key={i} data-ok={it.ok}>
                <span>{it.verb}</span>
                {it.detail && <i>{it.detail}</i>}
                {!it.ok && <em>failed</em>}
              </p>
            ) : it.kind === "draft" ? (
              <p className="dock__logDraft" key={i}>
                <a href={it.href}>Open the drafted message</a>
                {it.reference && <span>{it.reference}</span>}
              </p>
            ) : (
              <p className={`dock__logSaid dock__logSaid--${it.kind}`} key={i}>
                <span>{it.kind === "you" ? "you" : "agent"}</span>
                {it.kind === "note" || it.kind === "agent" || it.kind === "you" ? it.text : null}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
