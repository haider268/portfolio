import Link from "next/link";

/* A fixed hairline rail. The map is the primary navigation; this is the
   plain one — every destination, always reachable, no WebGL required. */
export default function Masthead() {
  return (
    <header className="frame">
      <Link href="/" className="frame__name">
        Haider Ali <span>/ AI systems</span>
      </Link>
      <nav className="frame__nav" aria-label="Site">
        <Link href="/work">Work</Link>
        <Link href="/systems">Systems</Link>
        <Link href="/demo">Agent</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </header>
  );
}
