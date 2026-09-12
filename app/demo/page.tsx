import type { Metadata } from "next";
import Masthead from "@/components/Masthead";
import MapStage from "@/components/MapStage";
import { mapNodes } from "@/lib/map";

export const metadata: Metadata = {
  title: "The agent",
  description:
    "A working agent that answers from the same content that renders this site — watch it light up the map as it reads.",
};

/* The agent, on the map, session already open. Ask it something and watch
   the nodes it retrieves flare — the search results in the SSE stream are
   the documents that light up. */

export default function Page() {
  return (
    <>
      <a className="skip" href="/work">
        Skip to the work index
      </a>

      <Masthead />

      <main id="main" className="mappage">
        <h1 className="sr-only">Talk to the live agent</h1>
        <MapStage nodes={mapNodes()} autoBegin />
      </main>
    </>
  );
}
