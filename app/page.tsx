import Image from "next/image";
import Link from "next/link";
import { getCapabilities, getCaseStudies } from "@/lib/content";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import SystemDiagram from "@/components/SystemDiagram";
import Trace, { type TraceRow } from "@/components/Trace";
import Index from "@/components/Index";
import Reliability from "@/components/Reliability";
import Resumes from "@/components/Resumes";
import Reveal from "@/components/Reveal";
import Todo from "@/components/Todo";

/* One lead's path. The two figures set in accent are the ones the system is
   built to hold — everything else is the shape of a run, not a guarantee. */
const TRACE: TraceRow[] = [
  { t: "00:00.0", event: "form submitted", meta: "Meta lead ad · paid social" },
  { t: "00:02.1", event: "contact created", meta: "CRM · tagged · pipeline stage set" },
  { t: "00:03.4", event: "validation passed", meta: "phone + required fields present" },
  { t: "00:41.7", event: "outbound call placed", meta: "inside the 60-second ceiling" },
  { t: "01:12.9", event: "timezone resolved", meta: "tool call · IANA zone from number + form" },
  { t: "01:28.3", event: "availability checked", meta: "tool call · live calendar read" },
  { t: "02:04.6", event: "appointment booked", meta: "slot held · conflict-checked" },
  { t: "02:05.1", event: "SMS sent", meta: "confirmation · address · cancel link" },
];

export default function Home() {
  const capabilities = getCapabilities("automation");
  const caseStudies = getCaseStudies("automation");

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <div className="page">
        <Masthead />

        <main id="main">
          {/* ═══ hero ═══════════════════════════════════════════════ */}
          <section className="hero" aria-labelledby="claim">
            <h1 className="display hero__claim" id="claim">
              <span className="hero__line">
                <span style={{ "--l": 0 } as React.CSSProperties}>
                  The opening week sold out.
                </span>
              </span>
              <span className="hero__line">
                <span style={{ "--l": 1 } as React.CSSProperties}>
                  Nobody answered the phone.
                </span>
              </span>
            </h1>

            <div className="hero__grid">
              <div className="hero__portrait">
                <Image
                  src="/portrait-tight-soft.jpg"
                  alt="Haider Ali"
                  width={880}
                  height={1100}
                  priority
                  sizes="(max-width: 62rem) 60vw, 20rem"
                />
              </div>

              <div className="hero__text">
                <p className="lead hero__lead">
                  Around 550 leads went into a system that called every one of
                  them back inside a minute, worked out where in the world they
                  were, and booked them. No receptionist was involved at any
                  point.
                </p>

                <div className="hero__thesis measure">
                  <p>
                    Haider Ali is a mechatronics engineer. Alongside the
                    automation work he does sensor fusion for an ADAS programme,
                    and that is where the habits come from: sense, decide, act in
                    real time, with nobody watching. Booking an appointment on a
                    live call is the same discipline pointed at revenue instead
                    of a vehicle — softer failure modes, faster feedback, and the
                    same intolerance for a system that answers from memory.
                  </p>
                </div>

                <div className="doors">
                  <Link className="door" href="#work">
                    <span className="door__label">If you are hiring</span>
                    <span className="door__title">See how it is built</span>
                    <span className="door__note">
                      Case studies, capability write-ups, four résumés
                    </span>
                  </Link>
                  <Link className="door door--alt" href="#contact">
                    <span className="door__label">If you need one built</span>
                    <span className="door__title">Have this run for you</span>
                    <span className="door__note">
                      What it takes, and how to start
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ the system ═════════════════════════════════════════ */}
          <section id="system" className="band" aria-labelledby="system-h">
            <div className="spread opener">
              <p className="note">
                <b>The system</b>
                Figures 1 and 2 — the mechanism, then one lead through it at
                its own real spacing.
              </p>
              <div className="body">
                <h2 className="title" id="system-h">
                  One lead, end to end, with nobody watching
                </h2>
                <p className="lead">
                  Leads arrive from paid social and enter the CRM tagged and
                  staged. Inside sixty seconds a voice agent calls, handles the
                  objection, works out the caller’s timezone, reads live
                  availability, books, and texts the confirmation before hanging
                  up.
                </p>
              </div>
            </div>

            <div className="spread">
              <div className="note">
                <b>Figure 1</b>
                the mechanism. Validation sits before the dial; the agent hangs
                off a tool bus.
              </div>
              <Reveal className="body">
                <SystemDiagram />
              </Reveal>
            </div>

            <div className="spread band__inner">
              <div className="note">
                <b>Figure 2</b>
                one lead, replayed at the true relative spacing of its own
                timestamps. The wait before the dial is a real wait.
                <i>≤60s form → dial</i>
                <i>~250ms timezone resolve</i>
                <i>0 human touches</i>
              </div>
              <div className="body">
                <Trace rows={TRACE} />
                <p className="caption">
                  Read the gap. Almost nothing happens between validation and the
                  dial, and then everything after the pickup happens inside two
                  minutes. That shape is the product: the expensive part of
                  answering a lead is the waiting, and the waiting is the part a
                  person cannot hold to a ceiling at three in the morning.
                </p>
                <Todo slug="an exported production log">
                  The sequence and the two committed figures — 60 seconds to
                  dial, ~250ms to resolve a zone — are what the system is built
                  to. The intermediate timestamps here show the shape of a run
                  rather than a specific one. A redacted export from a real call
                  belongs in this slot.
                </Todo>
              </div>
            </div>
          </section>

          {/* ═══ live agent ═════════════════════════════════════════ */}
          <section id="agent" className="band" aria-labelledby="agent-h">
            <div className="spread opener">
              <p className="note">
                <b>Live</b>
                Free tier, capped on purpose, and specific about what that
                costs in milliseconds.
              </p>
              <div className="body">
                <h2 className="title" id="agent-h">
                  Rather than read about the agent, watch one execute
                </h2>
                <p className="lead">
                  There is a working voice agent on this site. It answers
                  questions about Haider using tools, and it renders every tool
                  call as it fires.
                </p>
              </div>
            </div>

            <div className="spread">
              <div className="note">
                <b>Tradeoff</b>
                stated rather than hidden
                <i>~2.7s p50 — free browser path</i>
                <i>1000–1500ms — production budget</i>
              </div>
              <div className="body measure">
                <p>
                  The demo is deliberately the cheap path. Speech recognition and
                  speech synthesis run in your browser, and the server only does
                  text in, tool loop, text out — which is why it costs nothing to
                  host and why it is slower than the real thing. A production
                  agent runs streaming speech-to-text and text-to-speech against
                  a telephony leg and holds a turn budget of one to one and a
                  half seconds, because past about a second and a half a caller
                  starts talking over the agent.
                </p>
                <p>
                  It answers from the same MDX corpus that renders these pages.
                  One body of content, two consumers — so the agent cannot drift
                  from the site, and the site cannot drift from the agent.
                </p>
                <p className="cta">
                  <Link href="/demo">Open the live agent →</Link>
                </p>
              </div>
            </div>
          </section>

          {/* ═══ selected work ══════════════════════════════════════ */}
          <section id="work" className="band" aria-labelledby="work-h">
            <div className="spread opener">
              <p className="note">
                <b>Selected work</b>
                Two written up. The other verticals are named below and are
                not written yet.
              </p>
              <div className="body">
                <h2 className="title" id="work-h">
                  Systems in production
                </h2>
                <p className="lead">
                  What happened, in sequence, with the numbers. Each one maps
                  onto the capability pages below, which say how it is built.
                </p>
              </div>
            </div>
            <Index docs={caseStudies} base="/work" weight="feature" />
            <div className="spread">
              <div className="note" />
              <div className="body">
                <Todo slug="the other verticals">
                  Insurance, med spas and a golf academy run on the same spine.
                  Each needs its own account of what was different — the
                  objection handling, the qualifying questions, what broke — and
                  none of it is written yet.
                </Todo>
              </div>
            </div>
          </section>

          {/* ═══ capabilities ═══════════════════════════════════════ */}
          <section id="capabilities" className="band" aria-labelledby="cap-h">
            <div className="spread opener">
              <p className="note">
                <b>Capabilities</b>
                Six pages. Every stage of the diagram above has one behind it.
              </p>
              <div className="body">
                <h2 className="title" id="cap-h">
                  How each part is built
                </h2>
                <p className="lead">
                  The case studies say what happened. These say how it works, and
                  what each piece had to survive to stay in production.
                </p>
              </div>
            </div>
            <Index docs={capabilities} base="/systems" />
          </section>

          {/* ═══ reliability ════════════════════════════════════════ */}
          <section id="reliability" className="band" aria-labelledby="rel-h">
            <div className="spread opener">
              <p className="note">
                <b>Reliability</b>
                Nine failures that have happened, sorted by what each one
                costs to live with.
              </p>
              <div className="body">
                <h2 className="title" id="rel-h">
                  What breaks, and what happens next
                </h2>
                <p className="lead">
                  Every one of these has happened. What matters is which of the
                  three tiers it lands in — a failure you can make impossible
                  costs less than one you have to handle, and one you have to
                  handle costs less than one somebody has to be told about.
                </p>
              </div>
            </div>
            <Reliability />
          </section>

          {/* ═══ résumés ════════════════════════════════════════════ */}
          <section id="resumes" className="band" aria-labelledby="cv-h">
            <div className="spread opener">
              <p className="note">
                <b>Résumés</b>
                Four PDFs. One person, four readers who want different
                evidence.
              </p>
              <div className="body">
                <h2 className="title" id="cv-h">
                  Pick the one that matches the role
                </h2>
                <p className="lead">
                  Averaging four roles into one document produces a document that
                  fits none of them.
                </p>
              </div>
            </div>
            <Resumes />
          </section>

          {/* ═══ contact ════════════════════════════════════════════ */}
          <section id="contact" className="band" aria-labelledby="contact-h">
            <div className="spread opener">
              <p className="note">
                <b>Contact</b>
                Email is fastest. The agent will also take a message and hand
                it over.
              </p>
              <div className="body">
                <h2 className="title" id="contact-h">
                  Start with the awkward question
                </h2>
              </div>
            </div>
            <div className="spread">
              <div className="note">
                <b>Fastest</b>
                email, or ask the agent — it can take a message and hand it over.
              </div>
              <div className="body measure">
                <p>
                  If you are hiring: say which of the four résumés is closest and
                  what the team is actually short of. If you want a system built:
                  the useful first message is what currently happens to a lead
                  between the form and the first human — that is usually where
                  the money is going.
                </p>
                <Reveal className="contact__lines">
                  <a className="contact__line" href="mailto:haiderali2689832@gmail.com">
                    <span className="label">Email</span>
                    <span>haiderali2689832@gmail.com</span>
                  </a>
                  <a
                    className="contact__line"
                    href="https://www.linkedin.com/in/haiderali514"
                    rel="me noopener"
                  >
                    <span className="label">LinkedIn</span>
                    <span>linkedin.com/in/haiderali514</span>
                  </a>
                  <Link className="contact__line" href="/demo">
                    <span className="label">Or</span>
                    <span>ask the agent to take a message</span>
                  </Link>
                </Reveal>
              </div>
            </div>
          </section>
        </main>

        <Colophon />
      </div>
    </>
  );
}
