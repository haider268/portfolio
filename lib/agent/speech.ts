import { TOOL_NAMES } from "./tools";

/* SPEECH SAFETY.

   The model is instructed never to speak tool syntax aloud. Instructions are
   not a guarantee, and the failure is unusually ugly: a synthesised voice
   reading a JSON object to a recruiter. So the transport strips it as well.

   Belt and braces on purpose — the prompt is the request, this is the
   enforcement. Ported from the production agent this demo grew out of. */

const JUNK: RegExp[] = [
  /<function[\s\S]*?<\/function>/g, // <function=...>...</function>
  /<function[^>]*>/g,
  /```[\s\S]*?```/g, // code fences
  /\{[^{}]*\}/g, // JSON-ish objects
  new RegExp(`\\b(${TOOL_NAMES.join("|")})\\s*\\([^)]*\\)`, "g"), // tool_name(...)
  new RegExp(`\\b(${TOOL_NAMES.join("|")})\\b`, "g"),
  /"?\w+"?\s*[:=]\s*"[^"]*"/g, // key: "value"
];

export function cleanForSpeech(text: string): string {
  let out = text;
  for (const pat of JUNK) out = out.replace(pat, " ");
  return out.replace(/\s+/g, " ").trim().replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "");
}

/* CHUNKING FOR SPEECH.

   Speech is synthesised a chunk at a time, and the whole chunk is rendered
   before any of it can play — so the first chunk is the wait the visitor
   actually feels. Splitting on sentences alone is not enough: one long opening
   sentence is several seconds of silence before anything is heard.

   So a long sentence is split again at a clause boundary. The pause a comma
   already implies covers the join, and the first thing the visitor hears
   arrives in a fraction of the time. Later chunks are fetched while the
   earlier ones play, so only the first one costs anything. */

/** past this many characters a chunk is worth breaking at a clause */
const LONG = 130;
/** never emit a fragment shorter than this; it would sound clipped */
const MIN = 45;

const SENTENCE = /[^.!?]+[.!?]?/g;

function splitLong(chunk: string): string[] {
  if (chunk.length <= LONG) return [chunk];

  // the last clause boundary that still leaves a speakable head
  const head = chunk.slice(0, LONG);
  const cut = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "), head.lastIndexOf(" — "));
  if (cut < MIN) return [chunk];

  const first = chunk.slice(0, cut + 1).trim();
  const rest = chunk.slice(cut + 1).trim();
  if (rest.length < MIN) return [chunk];
  return [first, ...splitLong(rest)];
}

export function sentences(text: string): string[] {
  const cleaned = cleanForSpeech(text);
  return (cleaned.match(SENTENCE) ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap(splitLong);
}
