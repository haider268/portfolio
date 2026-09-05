import Link from "next/link";
import type { MDXComponents } from "mdx/types";

/* The component map MDX bodies render through. Anything an author reaches for
   in a .mdx file lands here, so a new page needs no code — which is the whole
   point of the content engine.

   Two authoring affordances beyond plain markdown:
     >  a blockquote becomes a pull quote
     <Note>  a mono side-note, the same voice as the margin column */

export function Note({ children }: { children: React.ReactNode }) {
  return <aside className="prose__note">{children}</aside>;
}

export function Fig({
  caption,
  children,
}: {
  caption: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <figure className="figure prose__figure">
      {children}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function Open({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <aside className="todo" aria-label={`Not yet written: ${slug}`}>
      <span className="todo__slug">To come — {slug}</span>
      <span className="todo__body">{children}</span>
    </aside>
  );
}

export const mdxComponents: MDXComponents = {
  a: ({ href = "", ...props }) =>
    href.startsWith("/") ? (
      <Link href={href} {...props} />
    ) : (
      <a href={href} rel="noopener" {...props} />
    ),
  blockquote: (props) => <blockquote className="pullquote" {...props} />,
  hr: () => <hr className="prose__rule" />,
  Note,
  Fig,
  Open,
};
