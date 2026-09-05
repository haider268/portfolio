import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCaseStudies, getDoc } from "@/lib/content";
import DocPage from "@/components/DocPage";

export function generateStaticParams() {
  return getCaseStudies("automation").map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc("automation", "case-studies", slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc("automation", "case-studies", slug);
  if (!doc) notFound();

  // the first case study by sort order is the flagship; it alone opens with a
  // drop cap, so the device stays a signal rather than a decoration
  const flagship = getCaseStudies("automation")[0]?.slug === slug;

  return (
    <DocPage
      doc={doc}
      dropcap={flagship}
      back={{ href: "/#work", label: "All work" }}
    />
  );
}
