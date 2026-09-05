import Link from "next/link";

/* Every link that leaves for another page opens in a new tab, so the page you
   were reading is still there when you come back.

   The hidden note is not decoration: a link that changes window without
   warning is a WCAG 3.2.5 problem, and the note is the cheapest honest fix —
   invisible on screen, read aloud by a screen reader. */
export default function Out({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const external = !href.startsWith("/");
  const props = {
    className,
    target: "_blank",
    rel: "noopener noreferrer",
  } as const;

  const body = (
    <>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );

  return external ? (
    <a href={href} {...props}>
      {body}
    </a>
  ) : (
    <Link href={href} {...props}>
      {body}
    </Link>
  );
}
