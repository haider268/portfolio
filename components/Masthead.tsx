import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

/* Five, not seven. Capabilities and résumés are reachable from the sections
   that introduce them; putting every destination up here costs the reader a
   decision on arrival and buys nothing. */
const NAV = [
  { href: "/#system", label: "The system" },
  { href: "/#work", label: "Work" },
  { href: "/#reliability", label: "Reliability" },
  { href: "/demo", label: "Live agent" },
  { href: "/#contact", label: "Contact" },
];

export default function Masthead() {
  return (
    <header className="masthead">
      <Link href="/" className="masthead__name">
        Haider Ali <span>— engineering</span>
      </Link>
      <nav aria-label="Sections">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </header>
  );
}
