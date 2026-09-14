/* The canonical site origin, resolved once.

   NEXT_PUBLIC_SITE_URL wins when set (the custom domain, later). On Vercel,
   VERCEL_PROJECT_PRODUCTION_URL is the stable production domain. Locally it
   falls back to localhost so absolute URLs never break in dev. */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");
