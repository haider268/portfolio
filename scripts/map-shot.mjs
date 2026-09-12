import { chromium } from "playwright";

const OUT = process.argv[2] ?? "shots";
const fs = await import("node:fs");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function page(w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
  p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 300)); });
  return p;
}

// home map: settle, hover a node, select it
let p = await page(1440, 900);
await p.goto("http://localhost:3200/", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
await p.screenshot({ path: `${OUT}/map-idle.png` });

// hover a work label
const label = p.locator(".mlabel", { hasText: "Campus navigation" });
await label.hover({ force: true });
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/map-hover.png` });

// select via canvas click on the label's node: click label's position slightly (labels navigate on click, so use keyboard focus instead)
await label.focus();
await p.waitForTimeout(1600);
await p.screenshot({ path: `${OUT}/map-selected.png` });

// drag orbit
await p.mouse.move(720, 450);
await p.mouse.down();
await p.mouse.move(950, 380, { steps: 12 });
await p.mouse.up();
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/map-orbited.png` });
await p.close();

// agent on the map: open console, ask, catch flare mid-turn
p = await page(1440, 900);
await p.goto("http://localhost:3200/", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
await p.click(".hud__console .begin");
await p.waitForTimeout(500);
await p.click("text=What breaks in production?");
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/map-agent-tool.png` });
await p.waitForTimeout(5000);
await p.screenshot({ path: `${OUT}/map-agent-answer.png` });
await p.close();

// index + doc pages
for (const [name, url] of [
  ["work-index", "/work"],
  ["systems-index", "/systems"],
  ["contact", "/contact"],
  ["doc-speech-loop", "/systems/speech-loop"],
  ["doc-reliability", "/systems/reliability"],
]) {
  p = await page(1440, 900);
  await p.goto(`http://localhost:3200${url}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) console.log(`${name}: H-OVERFLOW`);
  await p.close();
}

// mobile map + mobile work
p = await page(375, 720);
await p.goto("http://localhost:3200/", { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
await p.screenshot({ path: `${OUT}/m-map.png` });
await p.close();

p = await page(375, 720);
await p.goto("http://localhost:3200/work", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/m-work.png`, fullPage: true });
await p.close();

console.log("done");
await browser.close();
