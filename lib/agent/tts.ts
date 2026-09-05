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

/* Pinned deliberately. Cartesia rejects requests without it, and a floating
   version would let an upstream change break the voice with no deploy. */
const API_VERSION = "2026-08-14";

export const hasVoice = () => KEY.length > 0;

export type SpeechResult =
  | { ok: true; audio: ArrayBuffer; type: string }
  | { ok: false; status: number; message: string };

export async function speak(text: string, signal: AbortSignal): Promise<SpeechResult> {
  if (!KEY) return { ok: false, status: 503, message: "no voice configured" };

  /* Cartesia rate limits concurrent synthesis, and a rejected sentence would
     otherwise fall back to the browser voice — switching voice mid-reply, which
     sounds worse than either voice alone. Synthesis is a read, so it is safe to
     repeat. The client also fetches sentences one at a time; this covers the
     case where two visitors overlap. */
  for (let attempt = 0; ; attempt++) {
    const result = await once(text, signal);
    const retryable = !result.ok && (result.status === 429 || result.status >= 500);
    if (!retryable || attempt >= 2) return result;
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
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
