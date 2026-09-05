import { TOOL_NAMES } from "./tools";

/* SPEECH SAFETY.

   The model is instructed never to speak tool syntax aloud. Instructions are
   not a guarantee, and the failure is unusually ugly: a browser voice reading
   out a JSON object to a recruiter. So the transport strips it as well.

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

/* Split into sentence-sized chunks so the browser can start speaking the first
   sentence while the rest is still arriving. On the free browser path this is
   most of what makes the demo feel responsive rather than merely correct. */
const SENTENCE = /[^.!?]+[.!?]?/g;

export function sentences(text: string): string[] {
  const cleaned = cleanForSpeech(text);
  return (cleaned.match(SENTENCE) ?? []).map((s) => s.trim()).filter(Boolean);
}
