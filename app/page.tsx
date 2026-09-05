import Image from "next/image";
import { getCapabilities, getCaseStudies } from "@/lib/content";
import { CONTACT } from "@/lib/contact";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import Index from "@/components/Index";
import Out from "@/components/Out";
import Reveal from "@/components/Reveal";

/* An intro and a set of doors. Nothing is explained here — every explanation
   lives on the page behind the link. */

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
                  sizes="(max-width: 62rem) 60vw, 19rem"
                />
              </div>

              <div className="hero__text">
                <p className="lead hero__lead">
                  I&rsquo;m Haider. I build voice agents and automation that take
                  a lead from ad click to booked appointment without a
                  receptionist, in any timezone.
                </p>
                <p className="hero__note">
                  Every lead got a call within a minute of submitting the form.
                  About 550 of them, across the launch.
                </p>
              </div>
            </div>
          </section>

          <section id="work" className="band" aria-labelledby="work-h">
            <h2 className="title band__h" id="work-h">
              Work
            </h2>
            <Index docs={caseStudies} base="/work" />
          </section>

          <section id="capabilities" className="band" aria-labelledby="cap-h">
            <h2 className="title band__h" id="cap-h">
              What I build
            </h2>
            <Index docs={capabilities} base="/systems" />
          </section>

          <section id="agent" className="band" aria-labelledby="agent-h">
            <h2 className="title band__h" id="agent-h">
              Ask the agent
            </h2>
            <ul className="index">
              <Reveal as="li">
                <Out className="entry" href="/demo">
                  <span className="entry__title">Talk to it</span>
                  <span className="entry__hint">
                    Answers from these pages, shows every tool call
                  </span>
                  <span className="entry__go" aria-hidden="true">
                    →
                  </span>
                </Out>
              </Reveal>
            </ul>
          </section>

          <section id="contact" className="band" aria-labelledby="contact-h">
            <h2 className="title band__h" id="contact-h">
              Contact
            </h2>
            <Reveal className="contact__lines">
              <a className="contact__line" href={`mailto:${CONTACT.email}`}>
                <span className="label">Email</span>
                <span>{CONTACT.email}</span>
              </a>
              <Out className="contact__line" href={CONTACT.linkedin}>
                <span className="label">LinkedIn</span>
                <span>linkedin.com/in/haiderali514</span>
              </Out>
            </Reveal>
          </section>
        </main>

        <Colophon />
      </div>
    </>
  );
}
