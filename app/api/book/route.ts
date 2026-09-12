import { book, calendarReady, describe, freeSlots, HOST_TZ, isValidZone } from "@/lib/agent/calendar";
import { checkBookingLimit, clientIp } from "@/lib/agent/limits";

/* The manual booking path: the same calendar, limits, and idempotency as
   the agent's book_meeting tool, without the conversation. GET reads real
   availability; POST books a slot. Nothing here can do anything the agent
   cannot — one write path, two front doors. */

export const runtime = "nodejs";
export const maxDuration = 30;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET(req: Request) {
  if (!calendarReady()) return Response.json({ ready: false });

  const url = new URL(req.url);
  const rawTz = url.searchParams.get("tz") ?? "";
  const tz = isValidZone(rawTz) ? rawTz : HOST_TZ;

  try {
    const slots = await freeSlots(req.signal, 12);
    return Response.json({
      ready: true,
      tz,
      slots: slots.map((s) => ({
        slot_id: s.start,
        their_time: describe(new Date(s.start), tz),
        host_time: describe(new Date(s.start), HOST_TZ),
      })),
    });
  } catch {
    return Response.json({ ready: false });
  }
}

export async function POST(req: Request) {
  if (!calendarReady()) {
    return Response.json({ ok: false, code: "NOT_READY" }, { status: 503 });
  }

  let body: { name?: string; email?: string; slot_id?: string; topic?: string; tz?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, code: "BAD_REQUEST" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 80);
  const email = (body.email ?? "").trim().slice(0, 120);
  const slot = (body.slot_id ?? "").trim();
  const topic = (body.topic ?? "").trim().slice(0, 200);
  const tz = typeof body.tz === "string" && isValidZone(body.tz) ? body.tz : HOST_TZ;

  if (!name || !topic || !slot) {
    return Response.json({ ok: false, code: "MISSING_FIELDS" }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return Response.json({ ok: false, code: "BAD_EMAIL" }, { status: 400 });
  }
  if (!checkBookingLimit(clientIp(req))) {
    return Response.json({ ok: false, code: "LIMIT" }, { status: 429 });
  }

  try {
    const result = await book({ name, email, startISO: slot, topic }, req.signal);
    if (!result.ok) {
      return Response.json(
        { ok: false, code: result.reason === "taken" ? "TAKEN" : "FAILED" },
        { status: result.reason === "taken" ? 409 : 502 }
      );
    }
    return Response.json({
      ok: true,
      duplicate: result.duplicate,
      their_time: describe(new Date(result.start), tz),
      host_time: describe(new Date(result.start), HOST_TZ),
    });
  } catch {
    return Response.json({ ok: false, code: "FAILED" }, { status: 502 });
  }
}
