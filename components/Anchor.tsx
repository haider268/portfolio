import Link from "next/link";

/* One link component, one rule.

   Outbound links — a live app, a profile, anything not on this site — open in
   a new tab, so the page you were reading is still there when you come back.
   Internal links navigate in place: new-tabbing your own pages breaks the back
   button and leaves a pile of duplicate tabs behind.

   The hidden note on outbound links is not decoration. A link that changes
   window without warning is a WCAG 3.2.5 problem, and this is the cheapest
   honest fix: invisible on screen, read aloud by a screen reader. */
export default function Anchor({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const outbound = !href.startsWith("/") && !href.startsWith("#");

  if (!outbound) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  // mailto: and tel: leave the browser entirely; a target would do nothing
  const newTab = /^https?:/i.test(href);

  return (
    <a
      href={href}
      className={className}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {newTab && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
