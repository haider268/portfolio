import type { Metadata } from "next";
import Out from "@/components/Out";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import VoiceDemo from "@/components/VoiceDemo";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "The agent",
  description:
    "A working agent that answers from the same content that renders this site, and shows every tool call as it fires.",
};

export default function Page() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <div className="page">
        <Masthead />

        <main id="main">
          <article className="article">
            <header className="article__head">
              <h1 className="display article__title">Ask the agent</h1>
              <p className="lead article__summary">
                It answers from these pages, and shows you every tool call as it
                fires.
              </p>
            </header>

            <Reveal>
              <VoiceDemo />
            </Reveal>

            <div className="demo__notes">
              <p>
                Speech runs in your browser, so you can talk to it or type. It
                reads the same files that render the{" "}
                <Out href="/#work">case studies</Out> and{" "}
                <Out href="/#capabilities">capability pages</Out> — it cannot
                tell you anything the site does not say.
              </p>
              <p>
                It will not send anything on your behalf. Ask it to pass a
                message on and it drafts one for you to send.
              </p>
            </div>
          </article>
        </main>

        <Colophon />
      </div>
    </>
  );
}
