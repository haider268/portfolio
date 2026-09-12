# haider ali — portfolio

Next.js 16, no CSS framework. The homepage is a stage: a WebGL system core
(Three.js / React Three Fiber) whose state follows the live agent's real
SSE events, over crisp HTML sections. The writing lives on the pages behind
it.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # must stay clean
npx tsc --noEmit     # must stay clean
```

## Publishing a page

Drop a `.mdx` file into `content/<track>/<collection>/`. That is the whole
procedure — the page, its homepage index entry, and the agent's knowledge of it
all follow with no code change.

```
content/
  automation/
    case-studies/   ->  /work/<slug>
    capabilities/   ->  /systems/<slug>
  robotics/         ->  empty on purpose; a separate site, later
```

Frontmatter is schema-checked in `lib/content.ts`. A typo fails the build naming
the file and every problem in plain English. Required: `title`, `summary`.
Optional: `kicker`, `metric`, `order` (lower sorts first), `draft`, `stack`,
`year`, `role`.

In a body you get markdown plus `>` for a pull quote, `<Note>` for a side-note,
and three figures: `<SystemDiagram />`, `<Trace />`, `<FailureTiers />`.

**Missing material goes in an MDX comment**, never on the page:

```mdx
{/* Not written yet: the Deepgram before-and-after. Do not invent it. */}
```

## Voice

First person throughout. This is his own site, so nothing refers to him in the
third person, and nothing mentions robotics, ADAS or academic background — that
work belongs to a different site.

Numbers must not be misreadable. The sixty-second ceiling is per lead, from that
lead's own form submission; it is never phrased so it could be read as
throughput.

## The agent

`/demo` runs over the same MDX corpus that renders the site — one body of
content, two consumers, so the two cannot drift apart.

Speech recognition runs in the browser (Web Speech API). Text input is always
available: Firefox has no recognition and Safari's is unreliable.

Everything below is optional. Each missing piece degrades to something honest
rather than breaking, so the demo is never a dead button in front of a visitor.

| Missing | What happens instead |
| --- | --- |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | `/api/agent` searches the corpus directly and says so |
| `CARTESIA_API_KEY` | the browser's own voice, which is free and sounds it |
| Google credentials | no times are offered; it takes the request by email |

### Model

```
GEMINI_API_KEY=...        # free: https://aistudio.google.com/apikey
# or GROQ_API_KEY=...     # whichever is present wins; LLM_PROVIDER forces one
```

### Voice

`CARTESIA_API_KEY`. `/api/speak` takes one sentence and returns mp3, so the
first sentence plays while the rest of the reply is still generating. The key
never reaches the browser.

### Calendar

Four values turn on real availability and real bookings. Google emails the
invitation from whichever account owns the calendar, so the booking and the
invite are one API call — there is no mail server here.

1. console.cloud.google.com -> new project -> enable the Google Calendar API
2. OAuth consent screen -> External -> add your own Gmail as a test user
3. Credentials -> OAuth client ID -> Web application, redirect URI
   `http://localhost:5710/callback`
4. Put the id and secret in `.env.local`, then `node scripts/google-token.mjs`
5. Make a **separate** calendar for demo bookings and copy its Calendar ID

```
GOOGLE_CLIENT_ID=      GOOGLE_REFRESH_TOKEN=
GOOGLE_CLIENT_SECRET=  GOOGLE_CALENDAR_ID=
```

Point it at a dedicated calendar, not your main one — anything reachable from a
public page is eventually found by someone with nothing better to do.

Working hours come from `BOOKING_TIMEZONE`, `BOOKING_OPEN_HOUR`,
`BOOKING_CLOSE_HOUR` (past 24 crosses midnight — the default 16→28 is
16:00 until 04:00 the next morning), `BOOKING_SLOT_MINUTES`, and
`BOOKING_CLOSED_DAYS` (default `Sun`, matched by the day the window
starts). `BOOKING_HOST_EMAIL` is where the host's copy of the invite goes.

The browser sends its own IANA zone with every turn, so slots are offered on the
visitor's clock and stored as instants. Availability is re-read at the moment of
writing, because a slot read three turns ago is a recollection rather than a
fact, and the event id is derived from the email and the start time, so a retry
returns the same booking instead of a second one.

### Guardrails

`lib/agent/limits.ts` holds a session cap, a per-address rate limit, a daily
model ceiling, a separate speech allowance, and a booking cap of two per address
per day against twelve a day overall. **None of it is ever shown to a visitor**:
when a limit is hit the agent closes politely and offers email. They are
per-process, so on a multi-instance host they are a brake rather than a lock.

## Layout of the code

```
app/globals.css        the whole design system: tokens, then components
lib/content.ts         the content engine — do not weaken the validation
lib/state.ts           one zustand store: agent phase, tool events, pulses
lib/agent/             corpus, tools, prompt, provider, voice, calendar, limits
components/three/      the core scene — points, struts, tool wavefront
components/agent/      the console and its transport hook
components/Stage.tsx   scene + intro + console; WebGL and motion fallbacks
scripts/               Google token helper; Playwright screenshot scripts
public/portrait.jpg    cropped from ../Haider-Image.jpeg; the only image
```

The design is one committed dark environment (`color-scheme: dark`); there is
no theme toggle. The 3D layer is loaded dynamically and only where it can run:
no WebGL or `prefers-reduced-motion` gets a static emblem of the same core,
never an apology. The console, the scene, and the status rail all subscribe to
`lib/state.ts`, and only real backend events write to it — a tool call on the
server is the only thing that fires the wavefront.

Server-rendered HTML carries everything that matters; scroll reveals are CSS
view timelines, so blocked scripts leave nothing hidden.

## Notes

- `AGENTS.md` is generated by `next dev` and committed on purpose. Deleting it
  only brings it back as an uncommitted change.
- This repo has no remote by design.
