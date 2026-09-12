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
        </main>

        <Colophon />
      </div>
    </>
  );
}
