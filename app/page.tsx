import Masthead from "@/components/Masthead";
import MapStage from "@/components/MapStage";
import { mapNodes } from "@/lib/map";

/* The homepage is the map. One viewport, no scroll: the practice drawn as
   a navigable system, with the live agent at its core. Everything else —
   the work index, the subsystem index, contact — is a page you enter,
   from here or from the frame.

   The hidden index below is the same graph for crawlers and readers who
   arrive before hydration; the label layer inside the stage is the
   visible, focusable navigation. */

export default function Home() {
  const nodes = mapNodes();

  return (
    <>
      <a className="skip" href="/work">
        Skip to the work index
      </a>

      <Masthead />

      <main id="main" className="mappage">
        <h1 className="sr-only">
          Haider Ali — AI automation and GTM systems engineer. Production
          voice agents and revenue automation; this site runs a live agent.
        </h1>

        <nav className="sr-only" aria-label="All documents">
          <ul>
            {nodes
              .filter((n) => n.kind !== "core")
              .map((n) => (
                <li key={n.slug}>
                  <a href={n.href}>{n.title}</a> — {n.summary}
                </li>
              ))}
            <li>
              <a href="/demo">Talk to the live agent</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
          </ul>
        </nav>

        <MapStage nodes={nodes} />
      </main>
    </>
  );
}
