/* Cartesia speech, server-side.

   The browser's own speechSynthesis is free and sounds it — flat prosody, a
   different voice on every platform, and nothing you can tune. Cartesia's
   /tts/bytes is a plain HTTP POST returning audio, so it needs no WebSocket
   and no long-lived process: it drops into a route handler and still deploys
   to free hosting.

   The key is read here, which only ever runs on the server. If it is missing
   the caller gets a 503 and the browser falls back to its own voice — a worse
   demo, never a dead button. */

const KEY = process.env.CARTESIA_API_KEY?.trim() || "";
/* the voice carried over from the production agent this demo grew out of */
const VOICE = process.env.CARTESIA_VOICE_ID?.trim() || "71a7ad14-091c-4e8e-a314-022ece01c121";
const MODEL = process.env.CARTESIA_MODEL?.trim() || "sonic-3";

/* Deepgram Aura goes FIRST when its key exists: its free credit is measured
   in millions of characters, which for a portfolio is effectively "do not
   think about it" — exactly the property wanted from a primary voice.
   Cartesia (small monthly credit) is the reserve; the browser voice is the
   floor that can never run out. */
const DG_KEY = process.env.DEEPGRAM_API_KEY?.trim() || "";
const DG_MODEL = process.env.DEEPGRAM_TTS_MODEL?.trim() || "aura-2-thalia-en";

/* Pinned deliberately. Cartesia rejects requests without it, and a floating
   version would let an upstream change break the voice with no deploy. */
const API_VERSION = "2026-08-14";

export const hasVoice = () => DG_KEY.length > 0 || KEY.length > 0;

export type SpeechResult =
  | { ok: true; audio: ArrayBuffer; type: string }
  | { ok: false; status: number; message: string };

export async function speak(text: string, signal: AbortSignal): Promise<SpeechResult> {
  if (!hasVoice()) return { ok: false, status: 503, message: "no voice configured" };

  /* The chain: Deepgram, then Cartesia, then tell the browser to use its
     own voice (503). Each provider gets its own transient retries;
     synthesis is a read, so repeating is safe. */
  if (DG_KEY) {
    const dg = await withRetry(() => deepgramOnce(text, signal));
    if (dg.ok) return dg;
    if (signal.aborted) return dg;
  }
  if (KEY) {
    return withRetry(() => once(text, signal));
  }
  return { ok: false, status: 503, message: "voice providers exhausted" };
}

async function withRetry(fn: () => Promise<SpeechResult>): Promise<SpeechResult> {
  for (let attempt = 0; ; attempt++) {
    const result = await fn();
    const retryable = !result.ok && (result.status === 429 || result.status >= 500);
    if (!retryable || attempt >= 2) return result;
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
}

async function deepgramOnce(text: string, signal: AbortSignal): Promise<SpeechResult> {
  try {
    const res = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(DG_MODEL)}&encoding=mp3`,
      {
        method: "POST",
        headers: {
          authorization: `Token ${DG_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal,
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, message: detail.slice(0, 200) };
    }
    return { ok: true, audio: await res.arrayBuffer(), type: "audio/mpeg" };
  } catch (e) {
    return { ok: false, status: 502, message: e instanceof Error ? e.message : "deepgram failed" };
  }
}

async function once(text: string, signal: AbortSignal): Promise<SpeechResult> {
  const res = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Cartesia-Version": API_VERSION,
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model_id: MODEL,
      transcript: text,
      voice: { id: VOICE },
      language: "en",
      // mp3 plays natively everywhere and is small enough that a sentence
      // arrives in one chunk rather than needing its own stream
      output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: detail.slice(0, 200) };
  }

  return { ok: true, audio: await res.arrayBuffer(), type: "audio/mpeg" };
}
