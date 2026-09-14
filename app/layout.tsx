import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import AgentDock from "@/components/agent/AgentDock";
import { CONTACT } from "@/lib/contact";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

/* Three voices, each with one job. Instrument Serif speaks only in display
   sizes — the few large statements the site makes. Geist carries the working
   UI. Geist Mono carries everything the system says about itself: labels,
   events, readouts. */
const sans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Haider Ali — AI Automation & GTM Systems Engineer",
    template: "%s — Haider Ali",
  },
  description:
    "Production voice agents and revenue automation. Systems that answer, qualify, and book — with the live agent that runs this site as the proof.",
  openGraph: {
    title: "Haider Ali — AI Automation & GTM Systems Engineer",
    description:
      "Production voice agents and revenue automation. The site itself runs one.",
    type: "website",
  },
};

/* Structured data: what lets a search engine assemble a person, not just a
   link. Facts only — the same no-invention rule as everywhere else. */
const PERSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Haider Ali",
  jobTitle: "AI Automation & GTM Systems Engineer",
  url: SITE_URL,
  email: `mailto:${CONTACT.email}`,
  sameAs: [CONTACT.linkedin, "https://github.com/haider268"],
  knowsAbout: [
    "Voice AI agents",
    "Real-time STT-LLM-TTS pipelines",
    "Barge-in and endpointing",
    "GoHighLevel CRM automation",
    "Webhook middleware and HMAC verification",
    "LLM orchestration and RAG",
    "Timezone-correct scheduling",
    "GTM and pipeline engineering",
  ],
  worksFor: { "@type": "Organization", name: "Fynora AI" },
};

const SERVICE_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Haider Ali — AI Automation & GTM Systems",
  url: SITE_URL,
  description:
    "Production voice agents and revenue automation: lead pipelines, timezone-correct booking, and the reliability engineering that keeps them running.",
  founder: { "@type": "Person", name: "Haider Ali" },
  areaServed: "Worldwide",
};

export const viewport: Viewport = {
  themeColor: "#090c0b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_LD) }}
        />
        {children}
        {/* the agent rides above every page and survives its own navigation */}
        <AgentDock />
      </body>
    </html>
  );
}
