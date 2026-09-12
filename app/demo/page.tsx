import type { Metadata } from "next";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import Anchor from "@/components/Anchor";
import Stage from "@/components/Stage";

export const metadata: Metadata = {
  title: "The agent",
  description:
    "A working agent that answers from the same content that renders this site, and shows every tool call as it fires.",
};

/* The agent, full stage, session already open. The same system as the
   homepage — this route just arrives with the console up, for anyone who
   was sent straight here. */

export default function Page() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <Masthead />

      <main id="main">
        <Stage autoBegin />

        <div className="page">
          <div className="demo__notes">
            <p>
              Speech runs in your browser, so you can talk to it or type. It
              reads the same files that render the{" "}
              <Anchor href="/#work">case studies</Anchor> and{" "}
              <Anchor href="/#systems">subsystem pages</Anchor> — it cannot
              tell you anything the site does not say.
            </p>
            <p>
              It will not send anything on your behalf. Ask it to pass a
              message on and it drafts one for you to send.
            </p>
          </div>
          <Colophon />
        </div>
      </main>
    </>
  );
}
