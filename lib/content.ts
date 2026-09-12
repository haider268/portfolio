import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

/* ─────────────────────────────────────────────────────────────
   THE CONTENT ENGINE

   Drop a .mdx file into content/<track>/<collection>/ and it appears
   on the site. Delete it and it's gone. No code changes, ever.

   Frontmatter is schema-checked below. A typo fails the build with a
   readable message instead of shipping a broken page.
   ───────────────────────────────────────────────────────────── */

const ROOT = path.join(process.cwd(), "content");

export const TRACKS = ["automation", "robotics"] as const;
export type Track = (typeof TRACKS)[number];

const Frontmatter = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  kicker: z.string().optional(),
  /** headline number shown on the card, e.g. "42 booked in 36h" */
  metric: z.string().optional(),
  /** lower sorts first; ties fall back to title */
  order: z.number().default(100),
  draft: z.boolean().default(false),
  stack: z.array(z.string()).default([]),
  year: z.string().optional(),
  role: z.string().optional(),
  /** capability slugs this work runs on — these are the edges of the system
      map on the homepage; an unknown slug simply draws no edge */
  uses: z.array(z.string()).default([]),
});

export type Doc = z.infer<typeof Frontmatter> & {
  slug: string;
  track: Track;
  collection: string;
  body: string;
};

function readCollection(track: Track, collection: string): Doc[] {
  const dir = path.join(ROOT, track, collection);
  if (!fs.existsSync(dir)) return [];

  const docs = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);

      const parsed = Frontmatter.safeParse(data);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("\n");
        throw new Error(
          `\nInvalid frontmatter in content/${track}/${collection}/${file}\n${issues}\n`
        );
      }

      return { ...parsed.data, slug, track, collection, body: content };
    })
    .filter((d) => !d.draft || process.env.NODE_ENV === "development");

  return docs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export const getCaseStudies = (track: Track = "automation") =>
  readCollection(track, "case-studies");

export const getCapabilities = (track: Track = "automation") =>
  readCollection(track, "capabilities");

export function getDoc(track: Track, collection: string, slug: string) {
  return readCollection(track, collection).find((d) => d.slug === slug) ?? null;
}
