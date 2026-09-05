import Image from "next/image";
import Link from "next/link";
import { getCapabilities, getCaseStudies } from "@/lib/content";
import { CONTACT } from "@/lib/contact";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import SystemDiagram from "@/components/SystemDiagram";
import Index from "@/components/Index";
import Reveal from "@/components/Reveal";

/* The homepage is a way in, not the content. Every section is a title, a line,
   and a door. The writing lives on the pages behind them. */

export default function Home() {
  const capabilities = getCapabilities("automation");
  const caseStudies = getCaseStudies("automation");
  const flagship = caseStudies[0];

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <div className="page">
        <Masthead />

        <main id="main">
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
                  src="/portrait.jpg"
                  alt="Haider Ali"
                  width={1200}
                  height={1500}
                  priority
                  sizes="(max-width: 62rem) 60vw, 20rem"
                />
              </div>

              <div className="hero__text">
                <p className="lead hero__lead">
                  I build voice agents and automation that take a lead from ad
                  click to booked appointment without a receptionist, in any
                  timezone.
                </p>
                <p className="hero__note">
                  Every lead got a call within a minute of submitting the form.
                  About 550 of them, across the launch.
                </p>
              </div>
            </div>
          </section>

          <section id="system" className="band" aria-labelledby="system-h">
            <div className="opener opener--wide">
              <h2 className="title" id="system-h">
                One lead, end to end
              </h2>
              <p className="lead">
                Ad to CRM to a call inside sixty seconds. Booked on the call,
                confirmed by text before hanging up.
              </p>
            </div>

            <Reveal>
              <SystemDiagram />
            </Reveal>

            {flagship && (
              <p className="cta">
                <Link href={`/work/${flagship.slug}`}>Read what happened</Link>
              </p>
            )}
          </section>

          <section id="work" className="band" aria-labelledby="work-h">
            <div className="opener opener--wide">
              <h2 className="title" id="work-h">
                Work
              </h2>
            </div>
            <Index docs={caseStudies} base="/work" weight="feature" />
          </section>

          <section id="capabilities" className="band" aria-labelledby="cap-h">
            <div className="opener opener--wide">
              <h2 className="title" id="cap-h">
                How it is built
              </h2>
              <p className="lead">
                Mechanism, tradeoffs, and what each piece had to survive.
              </p>
            </div>
            <Index docs={capabilities} base="/systems" />
          </section>

          <section id="agent" className="band" aria-labelledby="agent-h">
            <div className="opener opener--wide">
              <h2 className="title" id="agent-h">
                Ask the agent
              </h2>
              <p className="lead">
                A working agent that answers from these pages and shows every
                tool call as it fires.
              </p>
            </div>
            <p className="cta">
              <Link href="/demo">Talk to it</Link>
            </p>
          </section>

          <section id="contact" className="band" aria-labelledby="contact-h">
            <div className="opener opener--wide">
              <h2 className="title" id="contact-h">
                Contact
              </h2>
            </div>
            <Reveal className="contact__lines">
              <a className="contact__line" href={`mailto:${CONTACT.email}`}>
                <span className="label">Email</span>
                <span>{CONTACT.email}</span>
              </a>
              <a className="contact__line" href={CONTACT.linkedin} rel="me noopener">
                <span className="label">LinkedIn</span>
                <span>linkedin.com/in/haiderali514</span>
              </a>
            </Reveal>
          </section>
        </main>

        <Colophon />
      </div>
    </>
  );
}
