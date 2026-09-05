import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import Trace from "./Trace";
import FailureTiers from "./FailureTiers";
import SystemDiagram from "./SystemDiagram";

/* The component map MDX bodies render through. Anything an author reaches for
   in a .mdx file lands here, so a new page needs no code.

   Beyond markdown: > becomes a pull quote, <Note> a mono side-note, and the
   three figures below can be dropped into any page that earns them. */

export function Note({ children }: { children: React.ReactNode }) {
  return <aside className="prose__note">{children}</aside>;
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
  Trace,
  FailureTiers,
  SystemDiagram,
};
