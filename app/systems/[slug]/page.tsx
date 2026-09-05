import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCapabilities, getDoc } from "@/lib/content";
import DocPage from "@/components/DocPage";

export function generateStaticParams() {
  return getCapabilities("automation").map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc("automation", "capabilities", slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc("automation", "capabilities", slug);
  if (!doc) notFound();

  return <DocPage doc={doc} back={{ href: "/#capabilities", label: "All capabilities" }} />;
}
