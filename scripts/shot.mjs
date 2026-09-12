import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const OUT = process.argv[2] ?? "shots";
const fs = await import("node:fs");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, { width = 1440, height = 900, full = false, before } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  if (before) await before(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`${name}: ${errors.length ? "ERRORS: " + errors.slice(0,3).join(" | ") : "ok"}${overflow ? " [H-OVERFLOW]" : ""}`);
  await page.close();
}

await shot("home-hero", "/");
await shot("home-full", "/", { full: true });
await shot("home-agent-open", "/", {
  before: async (p) => {
    await p.click("text=Talk to the system");
    await p.waitForTimeout(1200);
  },
});
await shot("work-doc", "/work/wellness-launch", { full: true });
await shot("system-doc", "/systems/voice-agents", { full: true });
await shot("demo", "/demo");
await shot("m-home-hero", "/", { width: 375, height: 720 });
await shot("m-home-full", "/", { width: 375, height: 720, full: true });
await shot("m-work", "/work/wellness-launch", { width: 375, height: 720, full: true });

await browser.close();
