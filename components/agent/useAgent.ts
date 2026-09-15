"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TOOL_VERBS, toolDetail, toolSlugs, useSystem } from "@/lib/state";

/* The agent's client half.

   Speech recognition and synthesis run in the browser; the server only moves
   text. This hook owns the transport — SSE parsing, the ordered TTS queue,
   Web Speech — and mirrors every real event into the system store so the
   scene and the console move together.

   Ported from the previous panel implementation; the plumbing was verified
   end to end and is kept, only the surface changed. */

export type FeedItem =
  | { kind: "you"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "tool"; verb: string; detail?: string; ok: boolean }
  | { kind: "draft"; href: string; reference?: string }
  | { kind: "note"; text: string };

/* hands-free stands down after this much TOTAL silence (no speech heard,
   no turn started) — long enough to think, short enough to not surveil */
const HF_SILENCE_MS = 120_000;

const CLOSING = "Thanks for stopping by. Email haiderali2689832@gmail.com any time.";

/* Spoken the moment a session opens — the agent talks first. Recorded in
   the history as a model turn so the model knows it already greeted. */
const GREETING =
  "Hi, I'm Vega — Haider's assistant, and the voice of this site. Ask me about his work, or tell me where you'd like to go.";

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

export function useAgent() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [sttReady, setSttReady] = useState(false);
  const [busy, setBusy] = useState(false);

  /* HANDS-FREE.

     Not an always-open mic — that is the echo loop from the failure
     catalogue, in a browser that gives us no AEC. Instead the turn-based
     gate from the production loop: the mic stays closed while the agent
     is speaking and re-arms when playback drains. Two silent attempts in
     a row and it stands down until the visitor speaks up or types —
     hands-free, not open-mic surveillance. */
  const [handsFree, setHandsFreeState] = useState(false);
  const handsFreeRef = useRef(false);
  /* the mic stays armed while the toggle is on; only a long stretch of
     total silence stands it down — and when that happens the TOGGLE turns
     off, visibly, instead of a lit switch over a dead mic */
  const lastVoiceActivity = useRef(0);

  const { phase, live, chain, setPhase, setLive, pushTool, clearChain } = useSystem();

  const speechOn = useRef(false);
  const history = useRef<{ role: "user" | "model"; text: string }[]>([]);
  const recognition = useRef<Recognition | null>(null);

  const audioQueue = useRef<Promise<void>>(Promise.resolve());
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const useBrowserVoice = useRef(false);
  /* two consecutive failures of any kind = the voice service is not coming
     back this session; stop paying a round trip per sentence to find out */
  const voiceFails = useRef(0);
  const stopped = useRef(false);

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
      stopped.current = true;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const push = useCallback((item: FeedItem) => setFeed((prev) => [...prev, item]), []);

  /* CAPTION SYNC.

     The caption is a subtitle, not a teleprompter: each sentence appears
     the moment its audio actually starts, so the text never runs seconds
     ahead of the voice. Every reveal path is guarded — audio start,
     browser-voice start, no-voice-at-all, failure, and a hard timeout —
     because a caption that never appears is worse than one that is early. */
  const spokenSoFar = useRef("");
  const revealTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const makeReveal = useCallback((text: string) => {
    let done = false;
    const reveal = () => {
      if (done || stopped.current) return;
      done = true;
      spokenSoFar.current = spokenSoFar.current
        ? `${spokenSoFar.current} ${text}`
        : text;
      setStreaming(spokenSoFar.current);
    };
    // the backstop: audio blocked, headless, or a provider hang — the
    // words still land
    const t = setTimeout(reveal, 3500);
    revealTimers.current.add(t);
    return () => {
      clearTimeout(t);
      revealTimers.current.delete(t);
      reveal();
    };
  }, []);

  const browserSpeak = useCallback((text: string, onStart?: () => void) => {
    if (!speechOn.current) {
      onStart?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.04;
    u.lang = "en-US";
    if (onStart) u.onstart = onStart;
    window.speechSynthesis.speak(u);
  }, []);

  const speak = useCallback(
    (text: string, onStart?: () => void) => {
      if (useBrowserVoice.current) {
        browserSpeak(text, onStart);
        return;
      }
      /* the fetch starts NOW, not behind the previous sentence's fetch —
         Deepgram takes concurrency happily, and playback order is enforced
         by the audio queue alone. This is most of the lag fix. */
      const pending = (async (): Promise<string | null> => {
        if (stopped.current || useBrowserVoice.current) return null;
        try {
          const res = await fetch("/api/speak", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text }),
          });
          if (res.status === 503) {
            useBrowserVoice.current = true;
            return null;
          }
          if (!res.ok) throw new Error(String(res.status));
          voiceFails.current = 0;
          return URL.createObjectURL(await res.blob());
        } catch {
          if (++voiceFails.current >= 2) useBrowserVoice.current = true;
          return null;
        }
      })();

      audioQueue.current = audioQueue.current.then(async () => {
        const url = await pending;
        if (!url) {
          if (!stopped.current) browserSpeak(text, onStart);
          return;
        }
        if (stopped.current) {
          URL.revokeObjectURL(url);
          return;
        }
        const audio = new Audio(url);
        audioEl.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().then(() => onStart?.()).catch(() => {
            onStart?.();
            resolve();
          });
        });
        URL.revokeObjectURL(url);
      });
    },
    [browserSpeak]
  );

  /* SCROLL CONTROL.

     The agent's scroll_page events land here. "auto" is a slow reading
     scroll on a rAF loop; any real user input — wheel, touch, arrow keys —
     cancels it immediately, because the visitor's hand always outranks the
     agent's. Route changes cancel it too. */
  const autoScroll = useRef<number | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScroll.current !== null) {
      cancelAnimationFrame(autoScroll.current);
      autoScroll.current = null;
    }
  }, []);

  useEffect(() => {
    const cancel = () => stopAutoScroll();
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    return () => {
      stopAutoScroll();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [stopAutoScroll]);

  const performScroll = useCallback(
    (action: string) => {
      stopAutoScroll();
      const page = () => document.documentElement;
      switch (action) {
        case "down":
          window.scrollBy({ top: window.innerHeight * 0.75, behavior: "smooth" });
          break;
        case "up":
          window.scrollBy({ top: -window.innerHeight * 0.75, behavior: "smooth" });
          break;
        case "top":
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "bottom":
          window.scrollTo({ top: page().scrollHeight, behavior: "smooth" });
          break;
        case "auto": {
          const tick = () => {
            const el = page();
            if (el.scrollTop + window.innerHeight >= el.scrollHeight - 2) {
              stopAutoScroll();
              return;
            }
            window.scrollBy(0, 1.1);
            autoScroll.current = requestAnimationFrame(tick);
          };
          autoScroll.current = requestAnimationFrame(tick);
          break;
        }
        // "stop": stopAutoScroll above already did the work
      }
    },
    [stopAutoScroll]
  );

  /* the reply a turn still owes the visible feed once its audio drains */
  const turnSeq = useRef(0);
  const unfinished = useRef<null | { reply: string; capped: boolean }>(null);

  const finalizeTurn = useCallback(() => {
    const u = unfinished.current;
    if (!u) return;
    unfinished.current = null;
    if (u.reply) push({ kind: "agent", text: u.reply });
    setStreaming("");
    spokenSoFar.current = "";
    setPhase(u.capped ? "ended" : "idle");
  }, [push, setPhase]);

  const silence = useCallback(() => {
    stopped.current = true;
    audioQueue.current = Promise.resolve();
    for (const t of revealTimers.current) clearTimeout(t);
    revealTimers.current.clear();
    if (audioEl.current) {
      audioEl.current.pause();
      audioEl.current = null;
    }
    if (speechOn.current) window.speechSynthesis.cancel();
  }, []);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy || phase === "ended") return;

      // a new turn flushes whatever the last one still owed the feed
      finalizeTurn();
      const turn = ++turnSeq.current;

      stopped.current = false;
      lastVoiceActivity.current = performance.now();
      setBusy(true);
      setDraft("");
      setStreaming("");
      spokenSoFar.current = "";
      clearChain();
      push({ kind: "you", text: clean });
      setPhase("thinking");
      let reply = "";
      let capped = false;

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: clean,
            history: history.current,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            // where the visitor is right now, so "this page" means something
            path: window.location.pathname,
          }),
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
              const verb = TOOL_VERBS[ev.name] ?? ev.name;
              const detail = toolDetail(ev.name, ev.args ?? {});
              // one real event, three surfaces: map, chain, feed — with the
              // slugs the tool actually touched, so the map can flare them
              pushTool(
                { name: ev.name, verb, detail, ok: ev.ok },
                toolSlugs(ev.name, ev.args ?? {}, ev.hits)
              );
              push({ kind: "tool", verb, detail, ok: ev.ok });
              if (ev.send_url) push({ kind: "draft", href: ev.send_url, reference: ev.reference });
              // the agent drives the browser: navigation and scrolling are
              // real events executed here, never animations
              if (typeof ev.path === "string") {
                stopAutoScroll();
                router.push(ev.path);
              }
              if (ev.name === "scroll_page" && ev.ok && typeof ev.args?.action === "string") {
                performScroll(ev.args.action);
              }
            } else if (ev.type === "chunk") {
              setPhase("speaking");
              reply = reply ? `${reply} ${ev.text}` : ev.text;
              // the caption appears when this sentence's AUDIO starts, so
              // the words never run seconds ahead of the voice
              speak(ev.text, makeReveal(ev.text));
            } else if (ev.type === "limited") {
              capped = true;
            }
          }
        }

        if (reply) {
          // history updates NOW so an immediate next turn knows this one;
          // the visible feed waits for the voice to finish (finalizeTurn)
          history.current = [
            ...history.current,
            { role: "user" as const, text: clean },
            { role: "model" as const, text: reply },
          ].slice(-24);
        }
      } catch {
        push({
          kind: "note",
          text: "That did not go through. Everything on these pages still stands, and haiderali2689832@gmail.com reaches Haider directly.",
        });
      } finally {
        setBusy(false);
        /* THE FLASH BUG LIVED HERE. The stream closes when the model stops
           GENERATING — seconds before the voice stops SPEAKING. Pushing the
           full reply and clearing the caption at that moment flashed the
           whole text, wiped it, then re-typed it as audio caught up. The
           turn now stays "speaking" and finalizes only when playback has
           actually drained; a new turn flushes it instantly instead. */
        unfinished.current = { reply, capped };
        void (async () => {
          await speechDrained();
          if (turnSeq.current === turn) finalizeTurn();
        })();
        if (!capped) void rearmRef.current();
      }
    },
    [busy, phase, push, speak, makeReveal, finalizeTurn, setPhase, pushTool, clearChain, router, performScroll, stopAutoScroll]
  );

  const listen = useCallback(() => {
    const r = recognition.current;
    if (!r || busy || phase === "ended") return;
    setPhase("listening");
    r.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      if (said) {
        lastVoiceActivity.current = performance.now();
        void send(said);
      }
    };
    r.onerror = () => setPhase("idle");
    r.onend = () => {
      if (useSystem.getState().phase !== "listening") return;
      /* hands-free is a call, not a countdown: keep re-arming through
         silence for as long as the toggle is on — up to two quiet minutes.
         Past that, stand down HONESTLY: the toggle itself switches off. */
      if (handsFreeRef.current) {
        if (performance.now() - lastVoiceActivity.current < HF_SILENCE_MS) {
          try {
            r.start();
            return;
          } catch {
            /* recognition refused a restart; stand down visibly below */
          }
        }
        handsFreeRef.current = false;
        setHandsFreeState(false);
      }
      setPhase("idle");
    };
    try {
      r.start();
    } catch {
      setPhase("idle");
    }
  }, [busy, phase, send, setPhase]);

  /* wait for everything queued to actually finish playing — the server
     voice resolves through the audio queue; the browser voice can only
     be polled */
  const speechDrained = useCallback(async () => {
    await audioQueue.current;
    if (speechOn.current) {
      // capped: Chrome's `speaking` flag can wedge true forever, and a
      // 15s ceiling beats a mic that never re-arms
      for (let i = 0; i < 100 && window.speechSynthesis.speaking; i++) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }, []);

  /* the hands-free re-arm: after a turn's speech drains, open the mic.
     Called through refs so the version that runs always sees the latest
     state, not the state of whichever turn created it. */
  const listenRef = useRef<() => void>(() => {});
  const rearm = useCallback(async () => {
    if (!handsFreeRef.current || !recognition.current) return;
    await speechDrained();
    const s = useSystem.getState();
    if (!handsFreeRef.current || stopped.current || s.phase !== "idle" || !s.live) return;
    lastVoiceActivity.current = performance.now();
    listenRef.current();
  }, [speechDrained]);
  const rearmRef = useRef(rearm);
  useEffect(() => {
    listenRef.current = listen;
    rearmRef.current = rearm;
  });

  const setHandsFree = useCallback(
    (on: boolean) => {
      handsFreeRef.current = on;
      setHandsFreeState(on);
      if (on) {
        lastVoiceActivity.current = performance.now();
        const s = useSystem.getState();
        if (s.live && s.phase === "idle" && !busy) void rearm();
      } else if (useSystem.getState().phase === "listening") {
        recognition.current?.stop();
      }
    },
    [busy, rearm]
  );

  /* The agent speaks first. Watching `live` (rather than wiring this into
     one button) means every way of opening a session greets — the dock
     pill, the map's core, the manifest, or /demo arriving already open. */
  const greeted = useRef(false);
  useEffect(() => {
    if (!live || greeted.current || history.current.length > 0) return;
    greeted.current = true;
    stopped.current = false;
    push({ kind: "agent", text: GREETING });
    history.current = [{ role: "model", text: GREETING }];
    speak(GREETING);
    void rearmRef.current();
  }, [live, push, speak]);

  const begin = useCallback(() => {
    setLive(true);
  }, [setLive]);

  const end = useCallback(() => {
    recognition.current?.stop();
    finalizeTurn(); // whatever the voice still owed the feed lands first
    silence();
    history.current = [];
    setBusy(false);
    setPhase("ended");
    push({ kind: "note", text: CLOSING });
  }, [finalizeTurn, silence, setPhase, push]);

  const restart = useCallback(() => {
    unfinished.current = null;
    history.current = [];
    setFeed([]);
    clearChain();
    setPhase("idle");
    greeted.current = false; // a fresh session greets again
  }, [clearChain, setPhase]);

  return {
    feed,
    draft,
    setDraft,
    streaming,
    sttReady,
    busy,
    phase,
    live,
    chain,
    handsFree,
    setHandsFree,
    begin,
    send,
    listen,
    end,
    restart,
  };
}
