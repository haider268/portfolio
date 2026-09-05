import { createHash } from "node:crypto";
import { contents, detail, search } from "./corpus";
import { RESUMES, CONTACT } from "@/lib/resumes";

/* Tool declarations in plain JSON Schema, plus the dispatch table that runs
   them. Single source of truth; the provider-specific shape is generated from
   it rather than maintained alongside it.

   Ported in spirit from the reservation agent this demo grew out of: tools
   return a structured {ok} result instead of raising, so a failure is
   something the model can say a sensible sentence about rather than an
   exception the turn dies inside. */

export type ToolResult = Record<string, unknown> & { ok: boolean };

export const TOOLS = [
  {
    name: "search_experience",
    description:
      "Search Haider's case studies and capability write-ups. Use this for any question about what he has built, how something works, tradeoffs, or failure modes. Always search before answering.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "the topic to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_project_detail",
    description:
      "Read a full case study or capability page by slug. Use after search_experience when the excerpt is not enough.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "the page slug, e.g. wellness-launch" },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_resume_section",
    description:
      "List the résumé versions, or get the one aimed at a particular kind of role.",
    parameters: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description:
            "the kind of role being hired for, e.g. voice ai, automation, applied ai, robotics. Omit to list all four.",
        },
      },
    },
  },
  {
    name: "book_meeting",
    description:
      "Record a request to talk. ONLY call after the visitor has confirmed the details back to you in a later turn.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        preferred_time: { type: "string", description: "in the visitor's own words" },
        topic: { type: "string" },
      },
      required: ["name", "email", "topic"],
    },
  },
  {
    name: "contact_request",
    description:
      "Record a message for Haider. ONLY call after the visitor has confirmed it back to you in a later turn.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        message: { type: "string" },
      },
      required: ["message"],
    },
  },
  {
    name: "request_human_handoff",
    description:
      "Hand over to Haider directly — for anything you cannot answer, anything commercially specific, or on request.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
        conversation_summary: { type: "string" },
      },
      required: ["reason"],
    },
  },
] as const;

export const TOOL_NAMES = TOOLS.map((t) => t.name);

/* Gemini wants JSON-Schema type values uppercased. */
function upperTypes(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(upperTypes);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      out[k] = k === "type" && typeof v === "string" ? v.toUpperCase() : upperTypes(v);
    }
    return out;
  }
  return schema;
}

export function geminiDeclarations() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: upperTypes(t.parameters),
  }));
}

/** Deterministic reference derived from the content of the request, not from a
    clock or a random source. The same message submitted twice produces the same
    reference, so a retry cannot create a second one. */
function reference(prefix: string, parts: (string | undefined)[]): string {
  const raw = parts.map((p) => (p ?? "").trim().toLowerCase()).join("|");
  return `${prefix}-${createHash("sha256").update(raw).digest("hex").slice(0, 8).toUpperCase()}`;
}

function mailto(subject: string, body: string): string {
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type Args = Record<string, unknown>;
const str = (a: Args, k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);

const DISPATCH: Record<string, (args: Args) => ToolResult> = {
  search_experience(args) {
    const query = str(args, "query");
    if (!query) return { ok: false, error_code: "INVALID_ARGUMENTS", message: "query is required" };
    const hits = search(query, 3);
    if (hits.length === 0) {
      return { ok: true, hits: [], note: "Nothing in the corpus matches. Say so plainly and offer a handoff.", contents: contents() };
    }
    return { ok: true, hits };
  },

  get_project_detail(args) {
    const slug = str(args, "slug");
    if (!slug) return { ok: false, error_code: "INVALID_ARGUMENTS", message: "slug is required" };
    const d = detail(slug);
    if (!d) return { ok: false, error_code: "NOT_FOUND", message: `No page with slug "${slug}".`, contents: contents() };
    return { ok: true, ...d };
  },

  get_resume_section(args) {
    const role = str(args, "role")?.toLowerCase();
    const all = RESUMES.map((r) => ({ ...r, url: `/resumes/${r.file}` }));
    if (!role) return { ok: true, resumes: all };
    const wants = (needle: string) => all.find((r) => r.file.includes(needle))!;
    const match =
      /voice|telephony|speech|call/.test(role) ? wants("voice-ai")
      : /robot|embedded|slam|ros|c\+\+|firmware/.test(role) ? wants("robotics")
      : /workflow|integration|crm|zapier|n8n|make/.test(role) ? wants("automation")
      // applied AI is the broadest of the four, so it is also the default
      : wants("applied-ai");
    return { ok: true, best_match: match, resumes: all };
  },

  book_meeting(args) {
    const name = str(args, "name");
    const email = str(args, "email");
    const topic = str(args, "topic");
    const when = str(args, "preferred_time");
    if (!name || !email || !topic) {
      return { ok: false, error_code: "INVALID_ARGUMENTS", message: "name, email and topic are all required" };
    }
    const ref = reference("MTG", [name, email, topic, when]);
    return {
      ok: true,
      reference: ref,
      // Honest about what this does. There is no calendar behind this demo and
      // pretending otherwise would be the one thing the whole site argues against.
      recorded: "request drafted",
      delivery: "not sent automatically — the visitor sends it",
      send_url: mailto(
        `Meeting request — ${name} [${ref}]`,
        `Name: ${name}\nEmail: ${email}\nPreferred time: ${when ?? "not stated"}\nTopic: ${topic}\n\nDrafted by the agent on Haider's site. Reference ${ref}.`
      ),
      say: "Tell them the request is drafted, give them the reference, and tell them to press Send on the draft — nothing is sent until they do.",
    };
  },

  contact_request(args) {
    const message = str(args, "message");
    if (!message) return { ok: false, error_code: "INVALID_ARGUMENTS", message: "message is required" };
    const name = str(args, "name");
    const email = str(args, "email");
    const ref = reference("MSG", [name, email, message]);
    return {
      ok: true,
      reference: ref,
      recorded: "message drafted",
      delivery: "not sent automatically — the visitor sends it",
      send_url: mailto(
        `Message from ${name ?? "a visitor"} [${ref}]`,
        `Name: ${name ?? "not given"}\nEmail: ${email ?? "not given"}\n\n${message}\n\nDrafted by the agent on Haider's site. Reference ${ref}.`
      ),
      say: "Tell them the message is drafted and they need to press Send.",
    };
  },

  request_human_handoff(args) {
    const reason = str(args, "reason") ?? "visitor asked for a person";
    const summary = str(args, "conversation_summary") ?? "";
    const ref = reference("HND", [reason, summary]);
    return {
      ok: true,
      reference: ref,
      email: CONTACT.email,
      linkedin: CONTACT.linkedin,
      send_url: mailto(`Handoff from the site agent [${ref}]`, `Reason: ${reason}\n\n${summary}\n\nReference ${ref}.`),
      say: "Hand over warmly, give the email, and stop trying to answer the question yourself.",
    };
  },
};

export function dispatch(name: string, args: Args): ToolResult {
  const fn = DISPATCH[name];
  if (!fn) return { ok: false, error_code: "UNKNOWN_TOOL", message: `No such tool: ${name}` };
  try {
    return fn(args ?? {});
  } catch (e) {
    return { ok: false, error_code: "TOOL_EXCEPTION", message: e instanceof Error ? e.message : String(e) };
  }
}
