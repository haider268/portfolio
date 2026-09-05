import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Two families, no third. Newsreader is variable on both weight and optical
   size, so one file does display and body — its opsz axis is what a third
   family would otherwise have been hired for. */
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
});

/* Plex Mono is not variable; only the two weights actually used are loaded. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Haider Ali — voice agents and revenue automation",
    template: "%s — Haider Ali",
  },
  description:
    "I build voice agents and automation that take a lead from ad click to booked appointment without a receptionist, in any timezone.",
  openGraph: {
    title: "Haider Ali — voice agents and revenue automation",
    description:
      "Voice agents and automation that answer, qualify, and book without a receptionist, in any timezone.",
    type: "website",
  },
};

/* Runs synchronously while the browser parses <head>, so the stored theme is
   on <html> before first paint. Without it the page flashes the OS theme
   before the stored choice applies. Nothing else depends on this script —
   the scroll animations are CSS view timelines. */
const BOOT_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${newsreader.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
