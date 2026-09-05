import type { Metadata } from "next";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import Colophon from "@/components/Colophon";
import VoiceDemo from "@/components/VoiceDemo";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "The live agent",
  description:
    "A working voice agent that answers from the same MDX corpus that renders this site, and renders every tool call as it fires.",
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
              <h1 className="display article__title">Watch it execute</h1>
              <p className="lead article__summary">
                A working agent, answering from the same content that renders
                these pages, with every tool call shown as it fires.
              </p>
            </header>

            <div className="spread">
              <div className="article__meta">
                <p className="note">
                  <b>Speech</b>
                  runs in your browser. Firefox has no recognition and Safari’s
                  is unreliable, so the text box is always there.
                </p>
                <p className="note">
                  <b>This path</b>
                  <i>~2.7s p50</i>
                  question in to first sentence out. The counter above is your
                  own session, measured live.
                </p>
                <p className="note">
                  <b>Production</b>
                  <i>1000–1500ms</i>
                  budget over a telephony leg
                </p>
                <p className="note">
                  <b>Back</b>
                  <Link href="/#system">The system</Link>
                </p>
              </div>

              <div className="body">
                <Reveal>
                  <VoiceDemo />
                </Reveal>

                <div className="prose demo__notes">
                  <h2>Why this one is slower, on purpose</h2>
                  <p>
                    Everything expensive has been taken out. Speech recognition
                    and synthesis run on your machine using the browser’s own
                    Web Speech API, so there is no streaming speech provider and
                    no audio ever reaches the server. The server does text in,
                    tool loop, text out. That is why it costs nothing to run and
                    why it will not stop working when a trial expires.
                  </p>
                  <p>
                    It is also why it is roughly twice the production budget. A
                    real deployment runs streaming speech-to-text and
                    text-to-speech against a telephony leg and holds one to one
                    and a half seconds per turn, because{" "}
                    <Link href="/systems/voice-agents">
                      past about a second and a half a caller starts talking over
                      the agent
                    </Link>
                    . The gap between the two numbers is the cost of the free
                    path, and it is a better thing to show you than to hide.
                  </p>

                  <h2>What it is actually doing</h2>
                  <p>
                    The tools are backed by the MDX files in{" "}
                    <code>content/</code> — the same files that render the case
                    studies and capability pages. One corpus, two consumers. The
                    agent cannot tell you something the site does not say,
                    because there is nowhere else for it to read.
                  </p>
                  <p>
                    Four behaviours are ported from the production agent rather
                    than rebuilt: it never answers from its own context, only
                    from a tool result; it will not act on your details until you
                    confirm them in a later turn; the reference it gives you is
                    derived from the content of the request, so asking twice
                    produces one reference rather than two; and the transport
                    strips anything that looks like tool syntax before the
                    browser can read it aloud.
                  </p>

                  <h2>What it will not do</h2>
                  <p>
                    Nothing is sent automatically. If you ask it to pass a
                    message on, it drafts one and hands it to you to send — there
                    is no mail server behind a static site, and pretending
                    otherwise would undercut the only thing this page is arguing.
                  </p>
                  <p>
                    There is a session cap, a per-address rate limit and a hard
                    daily ceiling. When one is hit the agent says so and falls
                    back to searching the site directly, which is a worse answer
                    and still a true one.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </main>

        <Colophon />
      </div>
    </>
  );
}
