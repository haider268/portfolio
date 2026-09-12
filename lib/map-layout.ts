/* The map's client-safe half: node types and the deterministic layout.
   No filesystem, no renderer — the 3D scene, the label layer, and the HTML
   manifest all consume this; lib/map.ts (server-only) builds the nodes
   from the content engine. */

export type MapNode = {
  slug: string;
  kind: "core" | "work" | "system";
  /** short name drawn on the map */
  label: string;
  /** full title for the detail panel */
  title: string;
  kicker?: string;
  metric?: string;
  summary?: string;
  href: string;
  /** capability slugs this node runs on — the graph's edges */
  uses: string[];
};

export type PlacedNode = MapNode & {
  pos: [number, number, number];
  angle: number;
  /** label hangs below the node instead of above — halves collisions */
  flip: boolean;
};

/* Deterministic layout, an orrery of the practice: subsystems ring the
   core; each case study sits at the circular mean of the subsystems it
   actually runs on. */
export function layoutNodes(nodes: MapNode[]): PlacedNode[] {
  const systems = nodes.filter((n) => n.kind === "system");
  const work = nodes.filter((n) => n.kind === "work");
  const byAngle = new Map<string, number>();
  const placed: PlacedNode[] = [];

  for (const n of nodes) {
    if (n.kind === "core") placed.push({ ...n, pos: [0, 0.1, 0], angle: 0, flip: false });
  }

  systems.forEach((n, i) => {
    const angle = (i / systems.length) * Math.PI * 2;
    byAngle.set(n.slug, angle);
    placed.push({
      ...n,
      angle,
      flip: i % 2 === 1,
      pos: [Math.cos(angle) * 2.45, 0.85 * Math.sin(i * 2.7) + 0.05, Math.sin(angle) * 2.45],
    });
  });

  work.forEach((n, i) => {
    const used = n.uses.map((u) => byAngle.get(u)).filter((a): a is number => a !== undefined);
    let angle: number;
    if (used.length) {
      const sx = used.reduce((s, a) => s + Math.cos(a), 0);
      const sy = used.reduce((s, a) => s + Math.sin(a), 0);
      angle = Math.atan2(sy, sx) + (i % 2 ? 0.34 : -0.34);
    } else {
      angle = (i / Math.max(work.length, 1)) * Math.PI * 2 + 0.5;
    }
    placed.push({
      ...n,
      angle,
      flip: i % 2 === 1,
      pos: [Math.cos(angle) * 4.35, 1.3 * Math.sin(i * 2.1) + 0.3, Math.sin(angle) * 4.35],
    });
  });

  return placed;
}
