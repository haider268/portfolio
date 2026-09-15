import { getCapabilities, getCaseStudies } from "./content";
import type { MapNode } from "./map-layout";

/* The system map's data — SERVER ONLY (reads the content engine). Every
   node is a document from content/, plus the agent core. Nothing is
   hand-placed: add a .mdx file and it appears on the map, with its
   edges, with no code change. Layout and types live in map-layout.ts,
   which is safe to import from the client. */

/** short map names for long titles; falls back to the title itself */
const SHORT: Record<string, string> = {
  "wellness-launch": "Wellness launch",
  "signl": "Signl",
  "followup-engine": "Follow-up engine",
  "voice-deployments": "Client deployments",
  "luma-bistro": "Luma Bistro",
  "campus-navigation": "Campus navigation",
  "site-agent": "This site's agent",
  "voice-agents": "Voice agents",
  "speech-loop": "Speech loop",
  "conversation-memory": "Conversation memory",
  "scheduling-timezone": "Timezone engine",
  "micro-tools": "Micro-tools",
  "pipelines-crm": "Pipelines & CRM",
  "gtm-engineering": "GTM middleware",
  "messaging-automation": "Messaging",
  "llm-orchestration": "LLM orchestration",
  "reliability": "Reliability",
  "call-qa": "Call QA",
};

export function mapNodes(): MapNode[] {
  const systems = getCapabilities("automation").map<MapNode>((d) => ({
    slug: d.slug,
    kind: "system",
    label: SHORT[d.slug] ?? d.title,
    title: d.title,
    kicker: d.kicker,
    metric: d.metric,
    summary: d.summary,
    href: `/systems/${d.slug}`,
    uses: [],
  }));

  const work = getCaseStudies("automation").map<MapNode>((d) => ({
    slug: d.slug,
    kind: "work",
    label: SHORT[d.slug] ?? d.title,
    title: d.title,
    kicker: d.kicker,
    metric: d.metric,
    summary: d.summary,
    href: `/work/${d.slug}`,
    uses: d.uses,
  }));

  return [
    {
      slug: "core",
      kind: "core",
      label: "Vega",
      title: "Vega — the live agent",
      kicker: "voice or text · answers from this map",
      summary:
        "Ask about anything on this map. It searches these documents and you watch it light up what it reads.",
      href: "/demo",
      uses: [],
    },
    ...systems,
    ...work,
  ];
}
