import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const apis: any[] = [];
  
  page.on('request', request => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
      apis.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });
  
  await page.goto("https://www.marktguru.de/ip/discounter-prospekte", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  // scroll down a few times
  for(let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(1000);
  }
  
  fs.writeFileSync("marktguru-api-requests.json", JSON.stringify(apis, null, 2));
  
  console.log("Captured Marktguru APIs:", apis.length);
  await browser.close();
})();
