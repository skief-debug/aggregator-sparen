import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";

chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const apis: string[] = [];
  
  page.on('response', async response => {
    if (response.url().includes('api') || response.headers()['content-type']?.includes('json')) {
      apis.push(response.url());
      if (response.url().includes('product') || response.url().includes('offer') || response.url().includes('campaign')) {
        try {
          const json = await response.json();
          fs.appendFileSync('api-log.txt', response.url() + '\n' + JSON.stringify(json).substring(0, 500) + '\n\n');
        } catch(e) {}
      }
    }
  });
  
  await page.goto("https://www.lidl.de/c/essen-trinken/s10068374", { waitUntil: "networkidle", timeout: 60000 });
  
  try {
    const cookieButton = page.locator('button#onetrust-accept-btn-handler');
    await cookieButton.waitFor({ state: "visible", timeout: 5000 });
    await cookieButton.click();
  } catch (e) {}

  await page.waitForTimeout(5000);
  console.log("Captured APIs:", apis.length);
  await browser.close();
})();
