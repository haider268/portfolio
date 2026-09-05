import { geminiDeclarations, TOOLS } from "./tools";

/* Two free tiers, one interface.

   Whichever key is present wins — Groq first, because Gemini's free tier is
   region-limited and will fail for some visitors in a way that is hard to
   diagnose from a browser. Plain fetch, no SDK: it is one HTTP call per turn
   and a dependency here would only be something else to keep current.

   Keys are read from the server environment and never reach the browser. */

const GEMINI_KEY = process.env.GEMINI_API_KEY?.trim() || "";
const GROQ_KEY = process.env.GROQ_API_KEY?.trim() || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

export type Provider = "groq" | "gemini" | "none";

const FORCED = process.env.LLM_PROVIDER?.trim().toLowerCase();

/** An explicit LLM_PROVIDER wins, but only if that provider's key is actually
    present — otherwise a stale setting would silently disable the agent. With
    nothing forced, Groq goes first: Gemini's free tier is region-limited and
    fails for some visitors in a way that is hard to diagnose from a browser. */
export function provider(): Provider {
  if (FORCED === "groq" && GROQ_KEY) return "groq";
  if (FORCED === "gemini" && GEMINI_KEY) return "gemini";
  if (GROQ_KEY) return "groq";
  if (GEMINI_KEY) return "gemini";
  return "none";
}

/* ── the provider-neutral conversation ─────────────────────────────────── */

export type Call = { id?: string; name: string; args: Record<string, unknown> };

export type Msg =
  | { role: "user"; text: string }
  | { role: "model"; text: string }
  /* `raw` is the provider's own representation of the turn that produced these
     calls. Gemini attaches an opaque thoughtSignature to functionCall parts and
     rejects the next request if it is not echoed back verbatim, so the model
     turn is replayed exactly as it arrived rather than reconstructed from the
     normalised call list. Providers that do not need it ignore it. */
  | { role: "calls"; calls: Call[]; raw?: unknown }
  | { role: "tool"; id?: string; name: string; result: unknown };

export type TurnResult = { text?: string; calls?: Call[]; raw?: unknown };

export async function turn(system: string, msgs: Msg[], signal: AbortSignal): Promise<TurnResult> {
  return provider() === "groq" ? groqTurn(system, msgs, signal) : geminiTurn(system, msgs, signal);
}

/* ── retry ─────────────────────────────────────────────────────────────── */

const RETRYABLE = /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded/i;

/** Reads are safe to repeat, and a model turn is a read. Backoff is capped so
    a struggling upstream degrades into a fallback rather than a hung request. */
async function post(url: string, init: RequestInit, signal: AbortSignal, tries = 3) {
  let wait = 700;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal });
    } catch (e) {
      if (attempt >= tries - 1 || signal.aborted) throw e;
      await sleep(wait, signal);
      wait *= 2;
      continue;
    }
    if (res.ok) return res.json();

    const body = await res.text().catch(() => "");
    const transient = RETRYABLE.test(String(res.status)) || RETRYABLE.test(body);
    if (!transient || attempt >= tries - 1) {
      throw new Error(`upstream ${res.status}: ${body.slice(0, 200)}`);
    }
    await sleep(wait, signal);
    wait *= 2;
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    }, { once: true });
  });
}

/* ── Gemini ────────────────────────────────────────────────────────────── */

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  /* opaque; carried back untouched */
  thoughtSignature?: string;
};

async function geminiTurn(system: string, msgs: Msg[], signal: AbortSignal): Promise<TurnResult> {
  const contents: { role: "user" | "model"; parts: GeminiPart[] }[] = [];

  for (const m of msgs) {
    if (m.role === "user") contents.push({ role: "user", parts: [{ text: m.text }] });
    else if (m.role === "model") contents.push({ role: "model", parts: [{ text: m.text }] });
    else if (m.role === "calls") {
      contents.push({
        role: "model",
        parts: (m.raw as GeminiPart[] | undefined) ??
          m.calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })),
      });
    } else {
      // Gemini expects function responses back under the user role, grouped
      // with any siblings from the same model turn
      const part: GeminiPart = {
        functionResponse: { name: m.name, response: { result: m.result } },
      };
      const last = contents[contents.length - 1];
      if (last?.role === "user" && last.parts.every((p) => p.functionResponse)) {
        last.parts.push(part);
      } else {
        contents.push({ role: "user", parts: [part] });
      }
    }
  }

  const json = (await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        tools: [{ functionDeclarations: geminiDeclarations() }],
        // replies are short and spoken; the cap holds latency and cost down
        generationConfig: { temperature: 0.2, maxOutputTokens: 320 },
      }),
    },
    signal
  )) as { candidates?: { content?: { parts?: GeminiPart[] } }[] };

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const calls = parts.flatMap((p) =>
    p.functionCall ? [{ name: p.functionCall.name, args: p.functionCall.args ?? {} }] : []
  );
  if (calls.length) return { calls, raw: parts };
  return { text: parts.flatMap((p) => (p.text ? [p.text] : [])).join(" ").trim() };
}

/* ── Groq (OpenAI-compatible chat completions) ─────────────────────────── */

type GroqMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

async function groqTurn(system: string, msgs: Msg[], signal: AbortSignal): Promise<TurnResult> {
  const messages: GroqMsg[] = [{ role: "system", content: system }];

  for (const m of msgs) {
    if (m.role === "user") messages.push({ role: "user", content: m.text });
    else if (m.role === "model") messages.push({ role: "assistant", content: m.text });
    else if (m.role === "calls") {
      messages.push({
        role: "assistant",
        content: "",
        tool_calls: m.calls.map((c, i) => ({
          id: c.id ?? `call_${i}`,
          type: "function" as const,
          function: { name: c.name, arguments: JSON.stringify(c.args) },
        })),
      });
    } else {
      messages.push({
        role: "tool",
        tool_call_id: m.id ?? "call_0",
        content: JSON.stringify(m.result),
      });
    }
  }

  const json = (await post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        tools: TOOLS.map((t) => ({ type: "function", function: t })),
        tool_choice: "auto",
        temperature: 0.2,
        max_completion_tokens: 320,
      }),
    },
    signal
  )) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: { id: string; function: { name: string; arguments: string } }[];
      };
    }[];
  };

  const msg = json.choices?.[0]?.message;
  const raw = msg?.tool_calls ?? [];
  if (raw.length) {
    return {
      calls: raw.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: safeParse(tc.function.arguments),
      })),
    };
  }
  return { text: (msg?.content ?? "").trim() };
}

function safeParse(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s || "{}");
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    // a model can emit malformed arguments; the tool reports the missing field
    // rather than the turn dying on a parse error
    return {};
  }
}
