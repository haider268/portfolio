import { speak } from "@/lib/agent/tts";
import { checkSpeakLimit, clientIp } from "@/lib/agent/limits";

/* Text in, audio out. One sentence per request, so the browser can start
   playing the first sentence while the rest of the reply is still arriving. */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** a spoken sentence; anything longer is not a sentence, it is a bill */
const MAX_CHARS = 400;

export async function POST(req: Request) {
  let text = "";
  try {
    text = String(((await req.json()) as { text?: string }).text ?? "").trim();
  } catch {
    return new Response("expected JSON", { status: 400 });
  }
  if (!text) return new Response("empty", { status: 400 });
  text = text.slice(0, MAX_CHARS);

  if (!checkSpeakLimit(clientIp(req))) {
    return new Response("slow down", { status: 429 });
  }

  const result = await speak(text, req.signal);
  if (!result.ok) {
    /* 503 is the browser's cue to fall back to its own voice for the whole
       session. Exhausted Cartesia credits arrive as 402/403 — that is not
       transient, so it gets the same treatment: degrade once, cleanly,
       instead of a doomed API round trip before every sentence. */
    const exhausted =
      result.status === 503 || result.status === 402 || result.status === 403;
    return new Response(result.message, { status: exhausted ? 503 : 502 });
  }

  return new Response(result.audio, {
    headers: {
      "content-type": result.type,
      "cache-control": "no-store",
      "content-length": String(result.audio.byteLength),
    },
  });
}
