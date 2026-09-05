/* Standing matter: a slug held open for copy that has not been written yet.

   These are deliberately visible. A portfolio that invents a client name, a
   date, or an incident to fill a gap loses the argument at the first interview
   follow-up; a portfolio that shows exactly which slugs are still open reads
   as someone who knows the difference between what he has measured and what
   he has not. Nothing here is filled with plausible fiction. */
export default function Todo({
  slug,
  children,
}: {
  /** short label for the missing material */
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="todo" aria-label={`Not yet written: ${slug}`}>
      <span className="todo__slug">To come — {slug}</span>
      <span className="todo__body">{children}</span>
    </aside>
  );
}
