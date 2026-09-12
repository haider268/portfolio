import Link from "next/link";

/* A fixed hairline rail. On the homepage it floats over the stage; on doc
   pages it sits over the page ground. The nav is anchors into the one
   system, not a second sitemap. */
export default function Masthead() {
  return (
    <header className="frame">
      <Link href="/" className="frame__name">
        Haider Ali <span>/ AI systems</span>
      </Link>
      <nav className="frame__nav" aria-label="Site">
        <a href="/#work">Work</a>
        <a href="/#systems">Systems</a>
        <a href="/#pipeline">Pipeline</a>
        <a href="/#reliability">Reliability</a>
        <a href="/#contact">Contact</a>
      </nav>
    </header>
  );
}
