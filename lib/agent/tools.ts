import { createHash } from "node:crypto";
import { contents, detail, search } from "./corpus";
import { CONTACT } from "@/lib/contact";
import { book, calendarReady, describe, freeSlots, HOST_TZ, isValidZone } from "./calendar";
import { checkBookingLimit } from "./limits";

/* Tool declarations in plain JSON Schema, plus the dispatch table that runs
   them. Single source of truth; the provider-specific shape is generated from
   it rather than maintained alongside it.

   Tools return a structured {ok} result instead of raising, so a failure is
   something the model can say a sensible sentence about rather than an
   exception the turn dies inside. */

export type ToolResult = Record<string, unknown> & { ok: boolean };

/** what is known about this visitor, threaded into every tool */
export type Ctx = {
  /** the visitor's own IANA zone, so times are quoted on their clock */
  tz: string;
  ip: string;
  signal: AbortSignal;
};

export const TOOLS = [
  {
    name: "search_experience",
    description:
      "Search the case studies and capability write-ups. Use this for any question about what was built, how something works, tradeoffs, or failure modes. Always search before answering.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "the topic to search for" } },
      required: ["query"],
    },
  },
  {
    name: "get_project_detail",
    description:
      "Read a full case study or capability page by slug. Use after search_experience when the excerpt is not enough.",
    parameters: {
      type: "object",
      properties: { slug: { type: "string", description: "the page slug, e.g. wellness-launch" } },
      required: ["slug"],
    },
  },
  {
    name: "open_page",
    description:
      "Open a page of this site in the visitor's browser. Use whenever they ask to see, open, visit, or be taken to something — the site navigates for them. Target is a page slug from the contents index, or one of: home, work, systems, contact, agent.",
    parameters: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "a page slug (e.g. scheduling-timezone) or home | work | systems | contact | agent",
        },
      },
      required: ["target"],
    },
  },
  {
    name: "scroll_page",
    description:
      "Scroll the page the visitor is looking at. Use when they ask to scroll, read on, go to the top or bottom, keep scrolling, or stop. Actions: down, up, top, bottom, auto (slow continuous reading scroll), stop.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "down | up | top | bottom | auto | stop",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "check_availability",
    description:
      "Read real open slots from the calendar. Call this before offering any time — never invent or guess availability. If the visitor asks for a specific time, day, or part of day (in ANY timezone), call this AGAIN with preferred_iso set to that moment; the slots returned are the nearest open ones to it. Never tell them a time is unavailable without having checked with preferred_iso.",
    parameters: {
      type: "object",
      properties: {
        preferred_iso: {
          type: "string",
          description:
            "the moment the visitor asked for, as full ISO 8601 with a UTC offset, e.g. 2026-09-14T10:00:00-07:00 for 10am Pacific. Convert their words (their timezone) into this yourself. Omit for a first general check.",
        },
      },
    },
  },
  {
    name: "book_meeting",
    description:
      "Book a slot on the calendar and email the invitation. The slot_id MUST be one of the exact slot_id values returned by check_availability. ONLY call after the visitor has confirmed the details back to you in a later turn.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        slot_id: { type: "string", description: "the exact slot_id from check_availability" },
        topic: { type: "string", description: "what they want to talk about, one short line" },
      },
      required: ["name", "email", "slot_id", "topic"],
    },
  },
  {
    name: "contact_request",
    description:
      "Draft a message for your inbox when the visitor does not want a meeting. ONLY call after they have confirmed it back to you in a later turn.",
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
      "Hand the conversation to email — for anything you cannot answer, anything commercially specific, or on request. Say you will pick it up yourself; never refer to yourself in the third person.",
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
    clock or a random source, so a retry cannot create a second one. */
function reference(prefix: string, parts: (string | undefined)[]): string {
  const raw = parts.map((p) => (p ?? "").trim().toLowerCase()).join("|");
  return `${prefix}-${createHash("sha256").update(raw).digest("hex").slice(0, 8).toUpperCase()}`;
}

function mailto(subject: string, body: string): string {
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type Args = Record<string, unknown>;
const str = (a: Args, k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Handler = (args: Args, ctx: Ctx) => ToolResult | Promise<ToolResult>;

const DISPATCH: Record<string, Handler> = {
  search_experience(args) {
    const query = str(args, "query");
    if (!query) return { ok: false, error_code: "INVALID_ARGUMENTS", message: "query is required" };
    const hits = search(query, 3);
    if (hits.length === 0) {
      return {
        ok: true,
        hits: [],
        note: "Nothing in the corpus matches. Say so plainly and offer a handoff.",
        contents: contents(),
      };
    }
    return { ok: true, hits };
  },

  open_page(args) {
    const target = str(args, "target")?.trim().toLowerCase().replace(/\s+/g, "-");
    if (!target) return { ok: false, error_code: "INVALID_ARGUMENTS", message: "target is required" };

    const FIXED: Record<string, { path: string; title: string }> = {
      home: { path: "/", title: "the system map" },
      map: { path: "/", title: "the system map" },
      work: { path: "/work", title: "the work index" },
      systems: { path: "/systems", title: "the subsystems index" },
      contact: { path: "/contact", title: "contact" },
      agent: { path: "/demo", title: "the agent" },
    };
    const fixed = FIXED[target];
    if (fixed) {
      return { ok: true, ...fixed, say: "Say in one short sentence that you have opened it." };
    }

    const d = detail(target);
    if (!d) {
      return {
        ok: false,
        error_code: "NOT_FOUND",
        message: `No page for "${target}".`,
        contents: contents(),
        say: "Pick the closest slug from contents and try open_page again, or say you could not find it.",
      };
    }
    return {
      ok: true,
      path: d.path,
      title: d.title,
      say: "Say in one short sentence that you have opened the page, and offer one thing worth noticing on it.",
    };
  },

  scroll_page(args) {
    const action = str(args, "action")?.trim().toLowerCase();
    const VALID = ["down", "up", "top", "bottom", "auto", "stop"];
    if (!action || !VALID.includes(action)) {
      return {
        ok: false,
        error_code: "INVALID_ARGUMENTS",
        message: `action must be one of ${VALID.join(", ")}`,
      };
    }
    // the browser performs the scroll when this event reaches it
    return { ok: true, action, say: "A word or two at most — do not narrate scrolling." };
  },

  get_project_detail(args) {
    const slug = str(args, "slug");
    if (!slug) return { ok: false, error_code: "INVALID_ARGUMENTS", message: "slug is required" };
    const d = detail(slug);
    if (!d) {
      return {
        ok: false,
        error_code: "NOT_FOUND",
        message: `No page with slug "${slug}".`,
        contents: contents(),
      };
    }
    return { ok: true, ...d };
  },

  async check_availability(args, ctx) {
    if (!calendarReady()) {
      return {
        ok: true,
        calendar: "not connected",
        say: "Say you cannot see the calendar right now, and offer to take their details by email instead.",
      };
    }
    try {
      // read the whole horizon, then rank: a visitor asking for "10am
      // Pacific" must be answered from every open slot, not the earliest six
      const all = await freeSlots(ctx.signal, 400);
      if (all.length === 0) {
        return { ok: true, slots: [], say: "Nothing open in the next week or so. Offer to take it by email." };
      }

      let picked = all.slice(0, 6);
      let ranked = false;
      let exact = false;
      const wanted = str(args, "preferred_iso");
      if (wanted) {
        const at = new Date(wanted).getTime();
        if (!Number.isNaN(at)) {
          // matching happens HERE, not in the model's context: only the
          // three closest open slots go back over the wire
          picked = [...all]
            .sort((a, b) => Math.abs(new Date(a.start).getTime() - at) - Math.abs(new Date(b.start).getTime() - at))
            .slice(0, 3)
            .sort((a, b) => a.start.localeCompare(b.start));
          ranked = true;
          exact = picked.some((s) => new Date(s.start).getTime() === at);
        }
      }

      return {
        ok: true,
        visitor_timezone: ctx.tz,
        ...(ranked
          ? {
              requested_time_available: exact,
              note: exact
                ? "the requested time itself is open"
                : "the requested time is NOT open; these are the nearest alternatives",
            }
          : {}),
        slots: picked.map((s) => ({
          slot_id: s.start,
          // both clocks, because that is the whole point of the scheduling work
          their_time: describe(new Date(s.start), ctx.tz),
          my_time: describe(new Date(s.start), HOST_TZ),
        })),
        say: ranked
          ? "Offer the closest matches in the timezone THEY have been using. If none are close to what they asked, say what the nearest actually is."
          : "Offer two or three of these in THEIR time, never in yours. Use the slot_id verbatim when booking.",
      };
    } catch (e) {
      return {
        ok: false,
        error_code: "CALENDAR_UNAVAILABLE",
        message: e instanceof Error ? e.message : "calendar read failed",
        say: "Say the calendar is not answering and offer to take their details by email.",
      };
    }
  },

  async book_meeting(args, ctx) {
    const name = str(args, "name");
    const email = str(args, "email");
    const slot = str(args, "slot_id");
    const topic = str(args, "topic");

    if (!name || !email || !topic || !slot) {
      return {
        ok: false,
        error_code: "INVALID_ARGUMENTS",
        message: "name, email, slot_id and topic are all required",
      };
    }
    if (!EMAIL.test(email)) {
      return {
        ok: false,
        error_code: "BAD_EMAIL",
        message: "That email address does not look valid.",
        say: "Ask them to repeat the email address; do not guess it.",
      };
    }

    // no calendar configured: fall back to drafting a request they send
    if (!calendarReady()) {
      const ref = reference("MTG", [name, email, topic, slot]);
      return {
        ok: true,
        reference: ref,
        recorded: "request drafted",
        delivery: "not sent automatically — the visitor sends it",
        send_url: mailto(
          `Meeting request — ${name} [${ref}]`,
          `Name: ${name}\nEmail: ${email}\nPreferred: ${slot}\nTopic: ${topic}\n\nDrafted by the site agent. Reference ${ref}.`
        ),
        say: "Tell them it is drafted and they need to press Send — nothing goes out until they do.",
      };
    }

    if (!checkBookingLimit(ctx.ip)) {
      return {
        ok: false,
        error_code: "TOO_MANY_BOOKINGS",
        message: "booking limit reached for this visitor",
        say: "Say you have booked as much as you can for now, and give the email address instead.",
      };
    }

    try {
      const result = await book({ name, email, startISO: slot, topic }, ctx.signal);
      if (!result.ok) {
        return result.reason === "taken"
          ? {
              ok: false,
              error_code: "SLOT_TAKEN",
              message: result.message,
              say: "Tell them that slot just went. Call check_availability again and offer the nearest alternatives.",
            }
          : {
              ok: false,
              error_code: "BOOKING_FAILED",
              message: result.message,
              say: "Say the booking did not go through, and offer the email address.",
            };
      }
      return {
        ok: true,
        booked: true,
        duplicate: result.duplicate,
        their_time: describe(new Date(result.start), ctx.tz),
        my_time: describe(new Date(result.start), HOST_TZ),
        invite: "Google has emailed the invitation to them",
        say: result.duplicate
          ? "They already had this booking. Confirm the time on their own clock; do not book again."
          : "Confirm the time in THEIR timezone and tell them the invite is in their inbox.",
      };
    } catch (e) {
      return {
        ok: false,
        error_code: "BOOKING_FAILED",
        message: e instanceof Error ? e.message : "booking failed",
        say: "Say the booking did not go through, and offer the email address.",
      };
    }
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
        `Name: ${name ?? "not given"}\nEmail: ${email ?? "not given"}\n\n${message}\n\nDrafted by the site agent. Reference ${ref}.`
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
      send_url: mailto(
        `Handoff from the site agent [${ref}]`,
        `Reason: ${reason}\n\n${summary}\n\nReference ${ref}.`
      ),
      say: "Say you will pick it up by email yourself, give the address, and stop trying to answer the question. Speak in the first person — never call yourself Haider.",
    };
  },
};

export async function dispatch(name: string, args: Args, ctx: Ctx): Promise<ToolResult> {
  const fn = DISPATCH[name];
  if (!fn) return { ok: false, error_code: "UNKNOWN_TOOL", message: `No such tool: ${name}` };
  const safe: Ctx = { ...ctx, tz: isValidZone(ctx.tz) ? ctx.tz : HOST_TZ };
  try {
    return await fn(args ?? {}, safe);
  } catch (e) {
    return { ok: false, error_code: "TOOL_EXCEPTION", message: e instanceof Error ? e.message : String(e) };
  }
}
