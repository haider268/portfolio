import type { Doc } from "@/lib/content";
import Anchor from "./Anchor";
import Reveal from "./Reveal";

/* A list of doors. Title, the one line of frontmatter that says what it is,
   and an arrow. The page behind it does the explaining. */
export default function Index({
  docs,
  base,
}: {
  docs: Doc[];
  /** "/work" or "/systems" */
  base: string;
}) {
  return (
    <ul className="index">
      {docs.map((d) => (
        <Reveal as="li" key={d.slug}>
          <Anchor className="entry" href={`${base}/${d.slug}`}>
            <span className="entry__title">{d.title}</span>
            {d.kicker && <span className="entry__hint">{d.kicker}</span>}
            <span className="entry__go" aria-hidden="true">
              →
            </span>
          </Anchor>
        </Reveal>
      ))}
    </ul>
  );
}
