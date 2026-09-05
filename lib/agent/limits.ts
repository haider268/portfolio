/* GUARDRAILS.

   A public demo wired to a metered API is a bill waiting to happen. Three
   independent ceilings, cheapest check first:

     session  — how long one visitor's conversation may run
     per-IP   — how fast one visitor may ask
     daily    — how much the whole site may spend before it stops

   Honest limitation: this state lives in the process. On a serverless host with
   more than one warm instance the effective limits are per-instance, so these
   are a brake rather than a lock. The hard ceiling that actually protects the
   account is the free-tier quota on the key itself; this keeps normal traffic
   well inside it and degrades politely instead of erroring. A shared store
   (Upstash's free Redis tier, say) is the upgrade if the site ever needs one. */

export const MAX_TURNS_PER_SESSION = 14;
export const MAX_TOOL_HOPS = 5;

const IP_WINDOW_MS = 10 * 60_000;
const IP_MAX = 24;
const DAILY_MAX = 600;

type Bucket = { count: number; resetAt: number };

const ips = new Map<string, Bucket>();
let daily: Bucket = { count: 0, resetAt: 0 };

function nextMidnightUTC(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export type LimitVerdict = { allowed: true } | { allowed: false; reason: string };

export function checkLimits(ip: string, turn: number): LimitVerdict {
  const now = Date.now();

  if (turn >= MAX_TURNS_PER_SESSION) {
    return {
      allowed: false,
      reason:
        "That is as long as one demo conversation runs. Reload the page to start again, or email Haider directly.",
    };
  }

  if (now >= daily.resetAt) daily = { count: 0, resetAt: nextMidnightUTC(now) };
  if (daily.count >= DAILY_MAX) {
    return {
      allowed: false,
      reason:
        "The demo has hit its daily ceiling — it runs on a free tier with a hard cap, deliberately. Everything the agent knows is on these pages, and email reaches Haider directly.",
    };
  }

  const bucket = ips.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    ips.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
  } else if (bucket.count >= IP_MAX) {
    return { allowed: false, reason: "Too many requests from here in the last few minutes. Give it a moment." };
  } else {
    bucket.count += 1;
  }

  // keep the map from growing without bound on a long-lived instance
  if (ips.size > 5000) {
    for (const [k, v] of ips) if (now >= v.resetAt) ips.delete(k);
  }

  daily.count += 1;
  return { allowed: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
