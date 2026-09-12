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

const CLOSING = "Thanks for stopping by. Email haiderali2689832@gmail.com any time.";

/* Spoken the moment a session opens — the agent talks first. Recorded in
   the history as a model turn so the model knows it already greeted. */
const GREETING =
  "Hello, welcome to Haider's portfolio. I'm the live agent that runs it — ask me about the work, or tell me where you'd like to go.";

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
  const silentTries = useRef(0);

  const { phase, live, chain, setPhase, setLive, pushTool, clearChain } = useSystem();

  const speechOn = useRef(false);
  const history = useRef<{ role: "user" | "model"; text: string }[]>([]);
  const recognition = useRef<Recognition | null>(null);

  const audioQueue = useRef<Promise<void>>(Promise.resolve());
  const fetchQueue = useRef<Promise<string | null>>(Promise.resolve(null));
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const useBrowserVoice = useRef(false);
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

  const browserSpeak = useCallback((text: string) => {
    if (!speechOn.current) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.04;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (useBrowserVoice.current) {
        browserSpeak(text);
        return;
      }
      /* every sentence is fetched the moment it arrives; playback stays in
         order, so only the first sentence is a wait the visitor feels */
      const pending = fetchQueue.current.then(async () => {
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
          return URL.createObjectURL(await res.blob());
        } catch {
          return null;
        }
      });
      fetchQueue.current = pending;

      audioQueue.current = audioQueue.current.then(async () => {
        const url = await pending;
        if (!url) {
          if (!stopped.current) browserSpeak(text);
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
          audio.play().catch(() => resolve());
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

  const silence = useCallback(() => {
    stopped.current = true;
    audioQueue.current = Promise.resolve();
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

      stopped.current = false;
      setBusy(true);
      setDraft("");
      setStreaming("");
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
              setStreaming(reply);
              speak(ev.text);
            } else if (ev.type === "limited") {
              capped = true;
            }
          }
        }

        if (reply) {
          push({ kind: "agent", text: reply });
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
        setStreaming("");
        setPhase(capped ? "ended" : "idle");
        if (!capped) void rearmRef.current();
      }
    },
    [busy, phase, push, speak, setPhase, pushTool, clearChain, router, performScroll, stopAutoScroll]
  );

  const listen = useCallback(() => {
    const r = recognition.current;
    if (!r || busy || phase === "ended") return;
    setPhase("listening");
    r.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      if (said) {
        silentTries.current = 0;
        void send(said);
      }
    };
    r.onerror = () => setPhase("idle");
    r.onend = () => {
      if (useSystem.getState().phase !== "listening") return;
      // hands-free: one quiet retry, then stand down rather than loop an
      // open mic at someone who has stopped talking
      if (handsFreeRef.current && silentTries.current < 1) {
        silentTries.current += 1;
        try {
          r.start();
          return;
        } catch {
          /* fall through to idle */
        }
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
      for (let i = 0; i < 200 && window.speechSynthesis.speaking; i++) {
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
    silentTries.current = 0;
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
    silence();
    history.current = [];
    setBusy(false);
    setPhase("ended");
    push({ kind: "note", text: CLOSING });
  }, [silence, setPhase, push]);

  const restart = useCallback(() => {
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
