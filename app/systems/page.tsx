import type { Metadata } from "next";
import { getCapabilities } from "@/lib/content";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import Anchor from "@/components/Anchor";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Subsystems",
  description: "What the work is made of — the map's inner ring.",
};

export default function Page() {
  const docs = getCapabilities("automation");

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <Masthead />

      <div className="page">
        <main id="main">
          <section className="band band--index" aria-labelledby="sys-h">
            <header className="band__head">
              <span className="band__index" aria-hidden="true">○</span>
              <h1 className="band__title" id="sys-h">Subsystems</h1>
              <p className="band__gloss">
                what the work is made of · the inner ring of <a href="/">the map</a>
              </p>
            </header>

            <ul className="bus">
              {docs.map((d) => (
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
        </main>

        <Colophon />
      </div>
    </>
  );
}
