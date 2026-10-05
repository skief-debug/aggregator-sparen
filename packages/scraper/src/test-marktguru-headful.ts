import { chromium } from "playwright";
import fs from "fs";

(async () => {
  console.log("Launching browser in HEADFUL mode...");
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto("https://www.marktguru.de/retailers/lidl", { waitUntil: "domcontentloaded" });
  
  console.log("Waiting 10s for offers to load...");
  await page.waitForTimeout(10000);
  
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync("marktguru-headful.txt", text);
  fs.writeFileSync("marktguru-headful.html", await page.content());
  
  console.log("Saved Marktguru output.");
  await browser.close();
})();
