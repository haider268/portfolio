import { create } from "zustand";

/* ONE STATE, THREE CONSUMERS.

   The agent hook writes here; the HTML console and the 3D core both read.
   That single subscription is what makes the site feel like one system
   instead of a page with separate animations: when a real tool call fires
   on the server, the same event moves the scene, the event rail, and the
   status line.

   Nothing in here is invented. `phase` follows the actual SSE stream;
   `pulseAt` is stamped only when a real tool event arrives. */

export type AgentPhase =
  | "idle"      // no session, ambient
  | "listening" // mic open, waiting on the visitor
  | "thinking"  // request in flight, nothing streamed yet
  | "tool"      // a tool call just fired
  | "speaking"  // reply streaming / audio playing
  | "ended";    // session closed by the visitor

/** short verbs the interface speaks instead of function names */
export const TOOL_VERBS: Record<string, string> = {
  search_experience: "search",
  get_project_detail: "retrieve",
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
  /** a session is open (console expanded, scene attentive) */
  live: boolean;
  /** tool calls of the current turn, in firing order */
  chain: ToolEvent[];
  /** ms timestamp of the last tool event — the scene reads this for its pulse */
  pulseAt: number;
  setPhase: (p: AgentPhase) => void;
  setLive: (v: boolean) => void;
  pushTool: (e: Omit<ToolEvent, "id">) => void;
  clearChain: () => void;
};

let seq = 0;

export const useSystem = create<SystemState>((set) => ({
  phase: "idle",
  live: false,
  chain: [],
  pulseAt: -1e9,
  setPhase: (phase) => set({ phase }),
  setLive: (live) => set({ live }),
  pushTool: (e) =>
    set((s) => ({
      chain: [...s.chain, { ...e, id: ++seq }],
      pulseAt: performance.now(),
      phase: "tool",
    })),
  clearChain: () => set({ chain: [] }),
}));

/** detail string worth surfacing for a given tool call, if any */
export function toolDetail(name: string, args: Record<string, unknown>): string | undefined {
  const pick =
    name === "search_experience" ? args.query :
    name === "get_project_detail" ? args.slug :
    name === "book_meeting" ? args.topic :
    undefined;
  return typeof pick === "string" ? pick.slice(0, 48) : undefined;
}
