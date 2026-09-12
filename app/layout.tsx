import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
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
  title: {
    default: "Haider Ali — AI systems",
    template: "%s — Haider Ali",
  },
  description:
    "Production voice agents and revenue automation. Systems that answer, qualify, and book — with the live agent that runs this site as the proof.",
  openGraph: {
    title: "Haider Ali — AI systems",
    description:
      "Production voice agents and revenue automation. The site itself runs one.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
