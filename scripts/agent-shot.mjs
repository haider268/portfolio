import { chromium } from "playwright";

const OUT = process.argv[2] ?? "shots";
const fs = await import("node:fs");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e)));

await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
await page.click("text=Talk to the system");
await page.waitForTimeout(600);
await page.click("text=What breaks in production?");
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/agent-mid-turn.png` });
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/agent-answered.png` });
// end the call
await page.click(".endcall");
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/agent-ended.png` });
console.log("done");
await browser.close();
