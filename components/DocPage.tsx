import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Doc } from "@/lib/content";
import Masthead from "./Masthead";
import Colophon from "./Colophon";
import DocConstellation from "./DocConstellation";
import { mdxComponents } from "./mdx";

/* One article layout for both collections: a mono meta rail and a single
   clean measure of prose. Crisp HTML on purpose — the contrast with the
   spatial stage is part of the design, not a downgrade. */
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

      <Masthead />

      <div className="page">
        <main id="main">
          <article className="article">
            <header className="article__head">
              <h1 className="article__title">{doc.title}</h1>
              <p className="article__summary">{doc.summary}</p>
            </header>

            <DocConstellation doc={doc} />

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
