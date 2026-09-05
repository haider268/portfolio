import Link from "next/link";
import type { Doc } from "@/lib/content";
import Reveal from "./Reveal";

/* A contents page, not a card grid. Each entry is a rule, a number set in the
   margin, the title at reading size and the one figure that entry earned. The
   hover draws a line rather than lifting a box. */
export default function Index({
  docs,
  base,
  weight = "compact",
}: {
  docs: Doc[];
  /** "/work" or "/systems" */
  base: string;
  weight?: "compact" | "feature";
}) {
  return (
    <ol className="index" data-weight={weight}>
      {docs.map((d, i) => (
        <Reveal as="li" key={d.slug} delay={i * 60}>
          <Link className="entry" href={`${base}/${d.slug}`}>
            <span className="entry__n" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="entry__main">
              <span className="entry__title">{d.title}</span>
              <span className="entry__summary">{d.summary}</span>
              {weight === "feature" && d.stack.length > 0 && (
                <span className="entry__stack">{d.stack.join("  ·  ")}</span>
              )}
            </span>
            <span className="entry__aside">
              {d.metric && <span className="entry__metric">{d.metric}</span>}
              <span className="entry__go" aria-hidden="true">
                Read
              </span>
            </span>
          </Link>
        </Reveal>
      ))}
    </ol>
  );
}
