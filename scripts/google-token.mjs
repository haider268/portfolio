/* One-time: mint the refresh token the agent uses to read and write your
   calendar.
 *
 * Run it once, paste the result into .env.local, and never run it again — a
 * refresh token does not expire unless you revoke it or leave the OAuth app in
 * "Testing" for more than seven days.
 *
 *   node scripts/google-token.mjs
 *
 * Before running, in https://console.cloud.google.com:
 *   1. Create a project, then enable the Google Calendar API for it.
 *   2. OAuth consent screen -> External -> add your own Gmail as a test user.
 *      Publish it when you are happy, or Testing tokens expire every 7 days.
 *   3. Credentials -> Create OAuth client ID -> Web application.
 *      Add http://localhost:5710/callback as an authorised redirect URI.
 *   4. Put the client id and secret in .env.local, then run this.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const PORT = 5710;
const REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar";

function fromEnvFile(key) {
  try {
    const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : "";
  } catch {
    return "";
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const clientId = fromEnvFile("GOOGLE_CLIENT_ID") || (await rl.question("GOOGLE_CLIENT_ID: ")).trim();
const clientSecret =
  fromEnvFile("GOOGLE_CLIENT_SECRET") || (await rl.question("GOOGLE_CLIENT_SECRET: ")).trim();
rl.close();

if (!clientId || !clientSecret) {
  console.error("\nNeed both a client id and a client secret. Add them to .env.local first.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    // both are required to be handed a refresh token rather than only an
    // access token that dies in an hour
    access_type: "offline",
    prompt: "consent",
  });

console.log("\nOpen this in a browser, sign in as the account that owns the calendar:\n");
console.log(authUrl + "\n");

const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== "/callback") return res.end();
    const c = url.searchParams.get("code");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(
      `<body style="font:16px system-ui;padding:3rem">${
        c ? "Done. Close this tab and go back to the terminal." : "No code came back."
      }</body>`
    );
    server.close();
    c ? resolve(c) : reject(new Error(url.searchParams.get("error") ?? "no code"));
  });
  server.listen(PORT, () => console.log(`Waiting on ${REDIRECT} …\n`));
});

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT,
    grant_type: "authorization_code",
  }),
});

if (!res.ok) {
  console.error("\nToken exchange failed:", res.status, await res.text());
  process.exit(1);
}

const { refresh_token } = await res.json();
if (!refresh_token) {
  console.error(
    "\nGoogle returned no refresh token. That happens when this app was already\n" +
      "authorised: revoke it at https://myaccount.google.com/permissions and rerun."
  );
  process.exit(1);
}

console.log("\nPaste this into .env.local:\n");
console.log(`GOOGLE_REFRESH_TOKEN=${refresh_token}\n`);
console.log(
  "Then create a calendar for demo bookings in Google Calendar, open its\n" +
    "Settings, and copy 'Calendar ID' into GOOGLE_CALENDAR_ID.\n"
);
