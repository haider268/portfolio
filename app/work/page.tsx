import type { Metadata } from "next";
import { getCaseStudies } from "@/lib/content";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import Anchor from "@/components/Anchor";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Work",
  description: "Systems in production — each one can be entered.",
};

/* The work index: the map's outer ring as a page. Crisp HTML on purpose. */

export default function Page() {
  const docs = getCaseStudies("automation");

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <Masthead />

      <div className="page">
        <main id="main">
          <section className="band band--index" aria-labelledby="work-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">◇</span>
              <h1 className="band__title" id="work-h">Work</h1>
              <p className="band__gloss">
                systems in production · positioned on <a href="/">the map</a> by
                the subsystems they run on
              </p>
            </header>

            <ol className="sysindex">
              {docs.map((d, i) => (
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
        </main>

        <Colophon />
      </div>
    </>
  );
}
