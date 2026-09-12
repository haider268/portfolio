import { getCapabilities, getCaseStudies, type Doc } from "@/lib/content";

/* THE SAME CORPUS THAT RENDERS THE SITE.

   The agent reads the MDX files in content/, not a separate knowledge base
   written to describe them. One body of content with two consumers: the pages
   you are reading, and the tools the agent calls. The agent therefore cannot
   drift from the site, and adding a .mdx file teaches the agent about it with
   no further work — the same property the pages have. */

export type Entry = Doc & { path: string };

export function allEntries(): Entry[] {
  return [
    ...getCaseStudies("automation").map((d) => ({ ...d, path: `/work/${d.slug}` })),
    ...getCapabilities("automation").map((d) => ({ ...d, path: `/systems/${d.slug}` })),
  ];
}

/** strip MDX/markdown syntax so an excerpt reads as prose when spoken aloud */
export function plain(body: string): string {
  return body
    .replace(/<Open[\s\S]*?<\/Open>/g, " ")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "is", "it", "for", "on",
  "with", "how", "what", "does", "do", "you", "your", "he", "his", "him",
  "that", "this", "are", "was", "can", "about", "me", "tell", "i",
]);

function terms(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export type Hit = {
  slug: string;
  title: string;
  path: string;
  kind: "case study" | "capability";
  summary: string;
  metric?: string;
  excerpt: string;
  score: number;
};

/** Keyword scoring over title, summary and body. Deliberately not embeddings:
    a corpus of this size does not need them, and a dependency-free search
    keeps the whole demo inside a free tier. */
export function search(query: string, limit = 3): Hit[] {
  const t = terms(query);
  const entries = allEntries();

  const scored = entries.map((e) => {
    const title = e.title.toLowerCase();
    const summary = `${e.summary} ${e.kicker ?? ""} ${e.stack.join(" ")}`.toLowerCase();
    const body = plain(e.body).toLowerCase();

    let score = 0;
    for (const term of t) {
      if (title.includes(term)) score += 6;
      if (summary.includes(term)) score += 3;
      const inBody = body.split(term).length - 1;
      score += Math.min(inBody, 4);
    }

    return { entry: e, score, body: plain(e.body) };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry, score, body }) => ({
      slug: entry.slug,
      title: entry.title,
      path: entry.path,
      kind: entry.collection === "case-studies" ? "case study" : "capability",
      summary: entry.summary,
      metric: entry.metric,
      excerpt: excerptFor(body, t),
      score,
    }));
}

/** the sentence window around the best term match, so the model quotes the
    relevant part rather than the opening paragraph of everything */
function excerptFor(body: string, t: string[]): string {
  const sentences = body.split(/(?<=[.!?])\s+/);
  let best = 0;
  let bestScore = -1;
  sentences.forEach((s, i) => {
    const low = s.toLowerCase();
    const sc = t.reduce((n, term) => n + (low.includes(term) ? 1 : 0), 0);
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return sentences.slice(best, best + 3).join(" ").slice(0, 520);
}

export function detail(slug: string) {
  const e = allEntries().find((x) => x.slug === slug);
  if (!e) return null;
  return {
    slug: e.slug,
    title: e.title,
    path: e.path,
    kind: e.collection === "case-studies" ? "case study" : "capability",
    summary: e.summary,
    metric: e.metric,
    stack: e.stack,
    role: e.role,
    text: plain(e.body).slice(0, 3200),
  };
}

/** the short index the model is given up front, so it knows what exists
    without a tool call and can pick a slug for get_project_detail */
export function contents() {
  return allEntries().map((e) => ({
    slug: e.slug,
    title: e.title,
    kind: e.collection === "case-studies" ? "case study" : "capability",
  }));
}
