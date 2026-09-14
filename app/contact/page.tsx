import type { Metadata } from "next";
import Image from "next/image";
import { CONTACT } from "@/lib/contact";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import Anchor from "@/components/Anchor";
import Reveal from "@/components/Reveal";
import BookingPanel from "@/components/BookingPanel";

export const metadata: Metadata = {
  title: "Contact",
  description: "Email, LinkedIn, GitHub — or ask the agent to book a time.",
};

export default function Page() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <Masthead />

      <div className="page">
        <main id="main">
          <section className="band band--index" aria-labelledby="con-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">●</span>
              <h1 className="band__title" id="con-h">Contact</h1>
              <p className="band__gloss">
                or <a href="/demo">ask the agent</a> to book a time on a real calendar
              </p>
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
            </div>
          </section>

          <section className="band" aria-labelledby="book-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">◒</span>
              <h2 className="band__title" id="book-h">Book a time</h2>
              <p className="band__gloss">
                the same calendar the agent books against — live availability,
                your timezone
              </p>
            </header>
            <Reveal>
              <BookingPanel />
            </Reveal>
          </section>

          <section className="band" aria-labelledby="prac-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">◆</span>
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
                    <span>AI Automation / Voice AI Engineer · Mar 2025—</span>
                  </li>
                  <li>
                    <span>Robionix Technologies</span>
                    <span>AI Design Engineer · Sep 2023 – Feb 2025</span>
                  </li>
                  <li>
                    <span>Orbon Technologies</span>
                    <span>Design Engineer · embedded C++ · Jun 2023 – Feb 2024</span>
                  </li>
                  <li>
                    <span>Freelance / self-employed</span>
                    <span>AI &amp; automation · early GoHighLevel, n8n, first agent work · before Orbon</span>
                  </li>
                  <li>
                    <span>B.E. Mechatronics</span>
                    <span>Air University, Islamabad</span>
                  </li>
                </ul>
                <ul className="practice__record">
                  <li>
                    <span>University technical society</span>
                    <span>Led 30+ members for a year · building-automation project end to end</span>
                  </li>
                  <li>
                    <span>University ambassador</span>
                    <span>Two national tech festivals · one best-ambassador distinction</span>
                  </li>
                </ul>
              </Reveal>
            </div>
          </section>
        </main>

        <Colophon />
      </div>
    </>
  );
}
