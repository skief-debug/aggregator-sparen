import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const apis: any[] = [];
  
  page.on('request', request => {
    if (request.url().includes('bonial') || request.url().includes('kaufda') || request.url().includes('api')) {
      apis.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });
  
  await page.goto("https://www.kaufda.de/Geschaefte/Lidl", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000); // let it load
  
  fs.writeFileSync("kaufda-api-requests.json", JSON.stringify(apis, null, 2));
  
  console.log("Captured KaufDa APIs:", apis.length);
  await browser.close();
})();
