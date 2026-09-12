import { chromium } from "playwright";

const OUT = process.argv[2] ?? "shots";
const fs = await import("node:fs");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));

await p.goto("http://localhost:3200/", { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
await p.screenshot({ path: `${OUT}/1-idle.png` });

// open the dock — the agent should greet first
await p.click(".summon");
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/2-greeting.png` });

// ask it to navigate
await p.fill(".dock__input", "take me to the timezone engine page");
await p.press(".dock__input", "Enter");
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/3-navigating.png` });
await p.waitForTimeout(5500);
await p.screenshot({ path: `${OUT}/4-arrived.png` });
console.log("URL after ask:", p.url());

// conversation must survive the navigation — ask a follow-up on the new page
await p.fill(".dock__input", "what makes it fast?");
await p.press(".dock__input", "Enter");
await p.waitForTimeout(6500);
await p.screenshot({ path: `${OUT}/5-followup.png` });
console.log("URL after follow-up:", p.url());

// session log
await p.click(".dock__log");
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/6-log.png` });

await browser.close();
console.log("done");
