import Reveal from "./Reveal";
import { RESUMES } from "@/lib/resumes";

/* Four versions because four different people read them, and the sensible
   thing is to let the reader pick rather than average them into one document
   that fits nobody. Each line says who it is for, in that person's language.
   Source PDFs are the ones Haider maintains; nothing here is regenerated. */


export default function Resumes() {
  return (
    <ul className="resumes">
      {RESUMES.map((r, i) => (
        <Reveal as="li" key={r.file} delay={i * 60}>
          <a className="entry" href={`/resumes/${r.file}`} download>
            <span className="entry__n" aria-hidden="true">
              PDF
            </span>
            <span className="entry__main">
              <span className="entry__title">{r.role}</span>
              <span className="entry__summary">{r.who}</span>
            </span>
            <span className="entry__aside">
              <span className="entry__go" aria-hidden="true">
                Download
              </span>
            </span>
          </a>
        </Reveal>
      ))}
    </ul>
  );
}
