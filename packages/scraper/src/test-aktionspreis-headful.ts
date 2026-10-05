import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto("https://www.aktionspreis.de/angebote/lidl", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000); // Wait for Cloudflare redirect loop to settle
  
  // Try to click cookie banner if it exists
  try {
     const cookieBtn = await page.locator("text=Akzeptieren").first();
     if (await cookieBtn.isVisible()) {
         await cookieBtn.click();
         await page.waitForTimeout(2000);
     }
  } catch(e) {}
  
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync("aktionspreis-headful.txt", text);
  fs.writeFileSync("aktionspreis-headful.html", await page.content());
  
  console.log("Saved Aktionspreis HTML. Length:", text.length);
  await browser.close();
})();
