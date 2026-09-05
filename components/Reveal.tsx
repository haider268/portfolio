/* A scroll-in wrapper with no JavaScript in it.

   This used to be a client component driving an IntersectionObserver, which
   meant every wrapped section was invisible until React hydrated — and if
   hydration was slow or broken, whole sections of the page stayed blank. The
   animation is now a CSS view timeline, so it is the browser's job. Where view
   timelines are unsupported the content is simply visible, which is the right
   failure. Nothing here can leave an element waiting on a script. */
export default function Reveal({
  children,
  className = "",
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "section" | "figure";
}) {
  return <As className={`reveal ${className}`}>{children}</As>;
}
