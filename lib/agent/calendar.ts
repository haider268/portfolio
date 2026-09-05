import { createHash } from "node:crypto";

/* Google Calendar, over plain fetch.

   Booking and the invite email are the same call: create an event with the
   visitor as an attendee and Google sends the invitation from the account that
   owns the calendar. No mail server, no second integration.

   Auth is an OAuth refresh token rather than a service account, because a
   service account cannot send invitations as a personal Gmail address without
   Workspace domain-wide delegation. Run `node scripts/google-token.mjs` once
   to mint the refresh token; see the README.

   Every value below is read on the server only. */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN?.trim() || "";
/** a calendar kept for demo bookings, so junk never touches the real one */
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID?.trim() || "";

/** the zone the working hours below are expressed in */
export const HOST_TZ = process.env.BOOKING_TIMEZONE?.trim() || "Asia/Karachi";
const OPEN_HOUR = Number(process.env.BOOKING_OPEN_HOUR ?? 10);
const CLOSE_HOUR = Number(process.env.BOOKING_CLOSE_HOUR ?? 19);
const SLOT_MINUTES = Number(process.env.BOOKING_SLOT_MINUTES ?? 30);
/** never offer something starting in the next few minutes */
const LEAD_MINUTES = 90;
const HORIZON_DAYS = 10;

export const calendarReady = () =>
  Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && CALENDAR_ID);

/* ── access tokens ─────────────────────────────────────────────────────── */

let cached: { token: string; expires: number } | null = null;

async function accessToken(signal: AbortSignal): Promise<string> {
  // a minute of slack, so a token cannot expire mid-request
  if (cached && Date.now() < cached.expires - 60_000) return cached.token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal,
  });
  if (!res.ok) throw new Error(`google auth ${res.status}: ${(await res.text()).slice(0, 160)}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/* ── time helpers ──────────────────────────────────────────────────────── */

/** the UTC offset of a zone at a given instant, in minutes */
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return (asUTC - at.getTime()) / 60_000;
}

/** the instant at which a given wall-clock time occurs in a zone */
function instantAt(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  // two passes settle daylight-saving boundaries
  let at = new Date(guess - offsetMinutes(new Date(guess), timeZone) * 60_000);
  at = new Date(guess - offsetMinutes(at, timeZone) * 60_000);
  return at;
}

function ymdIn(at: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    weekday: get("weekday"),
  };
}

/** an instant rendered as a human sentence in whatever zone the reader is in */
export function describe(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(at);
}

export function isValidZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/* ── availability ──────────────────────────────────────────────────────── */

export type Slot = { start: string; end: string };

/** every working slot in the horizon that Google reports as free */
export async function freeSlots(signal: AbortSignal, limit = 6): Promise<Slot[]> {
  const token = await accessToken(signal);
  const now = new Date();
  const from = new Date(now.getTime() + LEAD_MINUTES * 60_000);
  const to = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: CALENDAR_ID }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`freeBusy ${res.status}: ${(await res.text()).slice(0, 160)}`);

  const json = (await res.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const busy = (json.calendars?.[CALENDAR_ID]?.busy ?? []).map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  const out: Slot[] = [];
  for (let day = 0; day < HORIZON_DAYS && out.length < limit; day++) {
    const probe = new Date(now.getTime() + day * 86_400_000);
    const { y, m, d, weekday } = ymdIn(probe, HOST_TZ);
    if (weekday === "Sat" || weekday === "Sun") continue;

    for (let h = OPEN_HOUR * 60; h + SLOT_MINUTES <= CLOSE_HOUR * 60; h += SLOT_MINUTES) {
      const start = instantAt(y, m, d, Math.floor(h / 60), h % 60, HOST_TZ);
      const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
      if (start < from) continue;
      const clashes = busy.some((b) => start.getTime() < b.end && end.getTime() > b.start);
      if (clashes) continue;
      out.push({ start: start.toISOString(), end: end.toISOString() });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/* ── booking ───────────────────────────────────────────────────────────── */

/* Google event ids are base32hex: a-v and 0-9. Deriving one from the content
   of the request makes the write idempotent — the same booking submitted twice
   returns the existing event instead of creating a second one. */
function eventId(email: string, startISO: string): string {
  const raw = `${email.trim().toLowerCase()}|${startISO}`;
  const hex = createHash("sha256").update(raw).digest("hex").slice(0, 26);
  return "d" + hex.replace(/[w-z]/g, (c) => String(c.charCodeAt(0) % 10));
}

export type BookResult =
  | { ok: true; start: string; end: string; htmlLink?: string; duplicate: boolean }
  | { ok: false; reason: "taken" | "error"; message: string };

export async function book(
  { name, email, startISO, topic }: { name: string; email: string; startISO: string; topic: string },
  signal: AbortSignal
): Promise<BookResult> {
  const token = await accessToken(signal);
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, reason: "error", message: "unreadable start time" };
  }
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);

  // re-check the slot at the moment of writing: availability read a few turns
  // ago is a recollection, not a fact
  const slots = await freeSlots(signal, 40);
  if (!slots.some((s) => s.start === start.toISOString())) {
    return { ok: false, reason: "taken", message: "that slot is no longer free" };
  }

  const id = eventId(email, start.toISOString());
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?sendUpdates=all&conferenceDataVersion=0`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        id,
        summary: `${name} — ${topic}`.slice(0, 200),
        description: `Booked by the agent on haiderali's site.\n\nName: ${name}\nEmail: ${email}\nTopic: ${topic}`,
        start: { dateTime: start.toISOString(), timeZone: "UTC" },
        end: { dateTime: end.toISOString(), timeZone: "UTC" },
        attendees: [{ email, displayName: name }],
        reminders: { useDefault: true },
      }),
      signal,
    }
  );

  // the deterministic id already exists: the same request, submitted twice
  if (res.status === 409) {
    return { ok: true, start: start.toISOString(), end: end.toISOString(), duplicate: true };
  }
  if (!res.ok) {
    return { ok: false, reason: "error", message: (await res.text()).slice(0, 160) };
  }

  const json = (await res.json()) as { htmlLink?: string };
  return {
    ok: true,
    start: start.toISOString(),
    end: end.toISOString(),
    htmlLink: json.htmlLink,
    duplicate: false,
  };
}
