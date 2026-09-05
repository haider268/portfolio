import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

/* Five. Every destination up here costs the reader a decision on arrival, so
   anything reachable from the page below it does not belong in the nav. */
const NAV = [
  { href: "/#system", label: "The system" },
  { href: "/#work", label: "Work" },
  { href: "/systems/reliability", label: "Reliability" },
  { href: "/demo", label: "Agent" },
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
