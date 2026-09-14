import type { MetadataRoute } from "next";
import { getCapabilities, getCaseStudies } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/* Generated from the content engine, so a new .mdx file joins the sitemap
   with no code change — the same promise every other surface makes. */

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["", "/work", "/systems", "/contact", "/demo"].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const docs = [
    ...getCaseStudies("automation").map((d) => `/work/${d.slug}`),
    ...getCapabilities("automation").map((d) => `/systems/${d.slug}`),
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...fixed, ...docs];
}
