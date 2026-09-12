import Image from "next/image";
import { getCapabilities, getCaseStudies } from "@/lib/content";
import { CONTACT } from "@/lib/contact";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import Anchor from "@/components/Anchor";
import Reveal from "@/components/Reveal";
import Stage from "@/components/Stage";
import SystemDiagram from "@/components/SystemDiagram";
import FailureMap from "@/components/FailureMap";

/* One system, six sections. The stage holds the core and the live agent;
   everything below it is crisp HTML — the contrast is the design. */

export default function Home() {
  const caseStudies = getCaseStudies("automation");
  const capabilities = getCapabilities("automation");

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <Masthead />

      <main id="main">
        <Stage />

        <div className="page">
          {/* ── 01 · work ─────────────────────────────────────────────── */}
          <section id="work" className="band" aria-labelledby="work-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">01</span>
              <h2 className="band__title" id="work-h">Work</h2>
              <p className="band__gloss">systems in production — each one can be entered</p>
            </header>

            <ol className="sysindex">
              {caseStudies.map((d, i) => (
                <Reveal as="li" key={d.slug}>
                  <Anchor className="sysentry" href={`/work/${d.slug}`}>
                    <span className="sysentry__no" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="sysentry__main">
                      <span className="sysentry__title">{d.title}</span>
                      {d.kicker && <span className="sysentry__kicker">{d.kicker}</span>}
                      {d.stack.length > 0 && (
                        <span className="sysentry__stack">{d.stack.join(" · ")}</span>
                      )}
                    </span>
                    {d.metric && <span className="sysentry__metric">{d.metric}</span>}
                    <span className="sysentry__go" aria-hidden="true">→</span>
                  </Anchor>
                </Reveal>
              ))}
            </ol>
          </section>

          {/* ── 02 · systems ──────────────────────────────────────────── */}
          <section id="systems" className="band" aria-labelledby="sys-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">02</span>
              <h2 className="band__title" id="sys-h">Subsystems</h2>
              <p className="band__gloss">what the work is made of</p>
            </header>

            <ul className="bus">
              {capabilities.map((d) => (
                <Reveal as="li" key={d.slug}>
                  <Anchor className="bus__entry" href={`/systems/${d.slug}`}>
                    <span className="bus__node" aria-hidden="true" />
                    <span className="bus__title">{d.title}</span>
                    <span className="bus__summary">{d.summary}</span>
                    <span className="bus__go" aria-hidden="true">→</span>
                  </Anchor>
                </Reveal>
              ))}
            </ul>
          </section>

          {/* ── 03 · the flagship pipeline ────────────────────────────── */}
          <section id="pipeline" className="band" aria-labelledby="pipe-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">03</span>
              <h2 className="band__title" id="pipe-h">The revenue path</h2>
              <p className="band__gloss">ad click to booked appointment — no human at any stage</p>
            </header>

            <Reveal>
              <SystemDiagram />
            </Reveal>

            <div className="readouts">
              <div className="readout">
                <span className="readout__fig">≤60s</span>
                <span className="readout__what">from a lead&rsquo;s own form submission to its call</span>
              </div>
              <div className="readout">
                <span className="readout__fig">~250ms</span>
                <span className="readout__what">timezone resolved mid-conversation, no third party</span>
              </div>
              <div className="readout">
                <span className="readout__fig">42</span>
                <span className="readout__what">appointments booked in the first 36 hours of one launch</span>
              </div>
            </div>

            <p className="band__cta">
              <Anchor href="/work/wellness-launch">Read the launch it ran →</Anchor>
            </p>
          </section>

          {/* ── 04 · reliability ──────────────────────────────────────── */}
          <section id="reliability" className="band" aria-labelledby="rel-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">04</span>
              <h2 className="band__title" id="rel-h">Failure map</h2>
              <p className="band__gloss">fourteen production failure modes, and their mechanical handling</p>
            </header>

            <Reveal>
              <FailureMap />
            </Reveal>

            <p className="band__cta">
              <Anchor href="/systems/reliability">The reliability practice →</Anchor>
            </p>
          </section>

          {/* ── 05 · practice ─────────────────────────────────────────── */}
          <section id="practice" className="band" aria-labelledby="prac-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">05</span>
              <h2 className="band__title" id="prac-h">Practice</h2>
              <p className="band__gloss">two ways of building, one discipline</p>
            </header>

            <div className="practice">
              <div className="practice__paths">
                <Reveal className="path">
                  <p className="path__label">path a · platform</p>
                  <p className="path__text">
                    Production voice agents on VAPI and Retell, live with real
                    callers. Conversation design, qualification and booking
                    flows, telephony over Twilio and SIP — owned end to end.
                  </p>
                </Reveal>
                <Reveal className="path">
                  <p className="path__label">path b · from scratch</p>
                  <p className="path__text">
                    My own STT → LLM → TTS loop over WebSocket and WebRTC.
                    Barge-in, endpointing, sentence-chunked streaming,
                    deterministic idempotency, tool loops with a hop ceiling.
                    This site&rsquo;s agent is this path.
                  </p>
                </Reveal>
              </div>

              <Reveal className="practice__aside">
                <div className="practice__portrait">
                  <Image
                    src="/portrait.jpg"
                    alt="Haider Ali"
                    width={480}
                    height={600}
                    sizes="(max-width: 860px) 40vw, 13rem"
                  />
                </div>
                <ul className="practice__record">
                  <li>
                    <span>Fynora AI</span>
                    <span>AI Automation / Voice AI Engineer · 2025—</span>
                  </li>
                  <li>
                    <span>Robionix Technologies</span>
                    <span>AI Design Engineer · 2023–25</span>
                  </li>
                  <li>
                    <span>Orbon Technologies</span>
                    <span>Design Engineer · embedded C++ · 2023–24</span>
                  </li>
                  <li>
                    <span>B.E. Mechatronics</span>
                    <span>Air University, Islamabad</span>
                  </li>
                </ul>
              </Reveal>
            </div>
          </section>

          {/* ── 06 · contact ──────────────────────────────────────────── */}
          <section id="contact" className="band" aria-labelledby="con-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">06</span>
              <h2 className="band__title" id="con-h">Contact</h2>
              <p className="band__gloss">or ask the agent to book a time</p>
            </header>

            <div className="contact">
              <a className="contact__line" href={`mailto:${CONTACT.email}`}>
                <span className="contact__label">email</span>
                <span className="contact__value">{CONTACT.email}</span>
              </a>
              <Anchor className="contact__line" href={CONTACT.linkedin}>
                <span className="contact__label">linkedin</span>
                <span className="contact__value">linkedin.com/in/haiderali514</span>
              </Anchor>
              <Anchor className="contact__line" href="https://github.com/haider268">
                <span className="contact__label">github</span>
                <span className="contact__value">github.com/haider268</span>
              </Anchor>
              <a className="contact__line" href="#main">
                <span className="contact__label">agent</span>
                <span className="contact__value">talk to the system ↑</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      <div className="page">
        <Colophon />
      </div>
    </>
  );
}
