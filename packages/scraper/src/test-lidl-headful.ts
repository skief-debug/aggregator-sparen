import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";

chromium.use(stealth());

(async () => {
  console.log("Launching browser in HEADFUL mode...");
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto("https://www.lidl.de/c/essen-trinken/s10068374", { waitUntil: "domcontentloaded" });
  
  console.log("Waiting for 15 seconds to allow full render and manual captcha if any...");
  await page.waitForTimeout(15000);
  
  try {
    const btn = page.locator('button#onetrust-accept-btn-handler');
    await btn.click({ timeout: 5000 });
    console.log("Cookie banner accepted.");
  } catch (e) {
    console.log("No cookie banner.");
  }
  
  await page.waitForTimeout(5000);
  
  // Dump text content and HTML
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync("page-text.txt", text);
  fs.writeFileSync("page.html", await page.content());
  
  console.log("Saved page-text.txt and page.html");
  await browser.close();
})();
