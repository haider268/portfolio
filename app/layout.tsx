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
    default: "Haider Ali — control systems for revenue",
    template: "%s — Haider Ali",
  },
  description:
    "Mechatronics engineer building production voice agents and automation that qualify leads, book appointments, and run the revenue path unattended — worldwide, timezone-correct, with nobody watching.",
  openGraph: {
    title: "Haider Ali — control systems for revenue",
    description:
      "Production voice agents and automation that answer, qualify, and book without a receptionist. Sense, decide, act in real time.",
    type: "website",
  },
};

/* Runs synchronously while the browser parses <head>, so both flags are on
   <html> before first paint.

   theme — without this the page flashes the OS theme before the stored choice
   applies. js — every hide-then-reveal rule in the stylesheet is scoped to
   [data-js="on"], so if scripting is blocked or this script never runs, no
   element is ever left hidden waiting for an observer that will not fire. */
const BOOT_SCRIPT = `document.documentElement.dataset.js="on";try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

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
