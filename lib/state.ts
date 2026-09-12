import { create } from "zustand";

/* ONE STATE, EVERY SURFACE.

   The agent hook writes here; the console, the HUD, and the 3D system map
   all read. When a real tool call fires on the server, the same event moves
   the map, the event rail, and the status line — and when the agent reads a
   page, the map flares the node for that page, because the SSE stream
   carries the actual slugs the search returned.

   Nothing in here is invented. `phase` follows the SSE stream; `flare` is
   written only when a real tool event names real documents. */

export type AgentPhase =
  | "idle"      // no turn running
  | "listening" // mic open, waiting on the visitor
  | "thinking"  // request in flight, nothing streamed yet
  | "tool"      // a tool call just fired
  | "speaking"  // reply streaming / audio playing
  | "ended";    // session closed by the visitor

/** short verbs the interface speaks instead of function names */
export const TOOL_VERBS: Record<string, string> = {
  search_experience: "search",
  get_project_detail: "retrieve",
  open_page: "navigate",
  scroll_page: "scroll",
  check_availability: "calendar",
  book_meeting: "book",
  contact_request: "draft",
  request_human_handoff: "handoff",
};

export type ToolEvent = {
  id: number;
  name: string;
  /** the verb shown in the interface */
  verb: string;
  /** the one argument worth showing, e.g. the search query */
  detail?: string;
  ok: boolean;
};

type SystemState = {
  phase: AgentPhase;
  /** the console is open */
  live: boolean;
  /** tool calls of the current turn, in firing order */
  chain: ToolEvent[];
  /** ms timestamp of the last tool event — the map pulses its core on this */
  pulseAt: number;
  /** the documents the agent just touched — the map flares these nodes */
  flare: { slugs: string[]; at: number };
  /** map focus: the node the visitor is on (hover/keyboard) and the one selected */
  focusSlug: string | null;
  selectedSlug: string | null;
  setPhase: (p: AgentPhase) => void;
  setLive: (v: boolean) => void;
  pushTool: (e: Omit<ToolEvent, "id">, slugs?: string[]) => void;
  clearChain: () => void;
  setFocus: (slug: string | null) => void;
  setSelected: (slug: string | null) => void;
};

let seq = 0;

export const useSystem = create<SystemState>((set) => ({
  phase: "idle",
  live: false,
  chain: [],
  pulseAt: -1e9,
  flare: { slugs: [], at: -1e9 },
  focusSlug: null,
  selectedSlug: null,
  setPhase: (phase) => set({ phase }),
  setLive: (live) => set({ live }),
  pushTool: (e, slugs) =>
    set((s) => ({
      chain: [...s.chain, { ...e, id: ++seq }],
      pulseAt: performance.now(),
      phase: "tool",
      ...(slugs && slugs.length
        ? { flare: { slugs, at: performance.now() } }
        : {}),
    })),
  clearChain: () => set({ chain: [] }),
  setFocus: (focusSlug) => set({ focusSlug }),
  setSelected: (selectedSlug) => set({ selectedSlug }),
}));

/** detail string worth surfacing for a given tool call, if any */
export function toolDetail(name: string, args: Record<string, unknown>): string | undefined {
  const pick =
    name === "search_experience" ? args.query :
    name === "get_project_detail" ? args.slug :
    name === "open_page" ? args.target :
    name === "book_meeting" ? args.topic :
    undefined;
  return typeof pick === "string" ? pick.slice(0, 48) : undefined;
}

/** which document slugs a tool event actually touched */
export function toolSlugs(name: string, args: Record<string, unknown>, hits?: unknown): string[] {
  if (name === "get_project_detail" && typeof args.slug === "string") return [args.slug];
  if (name === "open_page" && typeof args.target === "string") return [args.target];
  if (name === "search_experience" && Array.isArray(hits)) {
    return hits.filter((h): h is string => typeof h === "string").slice(0, 5);
  }
  return [];
}
