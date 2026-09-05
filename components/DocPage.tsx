import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Doc } from "@/lib/content";
import Masthead from "./Masthead";
import Colophon from "./Colophon";
import { mdxComponents } from "./mdx";

/* One article layout for both collections. The margin column carries the
   apparatus — what this is, what it is built on, where it sits in the system —
   so the reading column stays a single clean measure of prose. */
export default function DocPage({
  doc,
  dropcap = false,
  back,
}: {
  doc: Doc;
  /** the flagship case study opens with a drop cap; nothing else does */
  dropcap?: boolean;
  back: { href: string; label: string };
}) {
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
              <h1 className="display article__title">{doc.title}</h1>
              <p className="lead article__summary">{doc.summary}</p>
            </header>

            <div className="spread">
              <div className="article__meta">
                {doc.kicker && (
                  <p className="note">
                    <b>In short</b>
                    {doc.kicker}
                  </p>
                )}
                {doc.metric && (
                  <p className="note">
                    <b>Figure</b>
                    <i>{doc.metric}</i>
                  </p>
                )}
                {doc.role && (
                  <p className="note">
                    <b>Role</b>
                    {doc.role}
                  </p>
                )}
                {doc.stack.length > 0 && (
                  <p className="note">
                    <b>Built on</b>
                    {doc.stack.join(" · ")}
                  </p>
                )}
                <p className="note">
                  <b>Back</b>
                  <Link href={back.href}>{back.label}</Link>
                </p>
              </div>

              <div className="body prose" data-dropcap={dropcap ? "" : undefined}>
                <MDXRemote source={doc.body} components={mdxComponents} />
              </div>
            </div>
          </article>
        </main>

        <Colophon />
      </div>
    </>
  );
}
