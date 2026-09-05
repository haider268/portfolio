import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

/* Name and a theme control, nothing else. The homepage is a short list of
   doors, so a nav bar duplicating it would be the same links twice. */
export default function Masthead() {
  return (
    <header className="masthead">
      <Link href="/" className="masthead__name">
        Haider Ali <span>— engineering</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
