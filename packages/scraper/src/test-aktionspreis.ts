import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.aktionspreis.de/angebote/lidl", { waitUntil: "domcontentloaded" });
  
  // Wait for 5 seconds to load
  await page.waitForTimeout(5000);
  
  const products = await page.evaluate(() => {
    const items = document.querySelectorAll(".product-item, .item, .offer");
    return Array.from(items).map(el => el.textContent?.trim().substring(0, 50)).filter(t => t);
  });
  
  console.log("Found on Aktionspreis:", products.length > 0 ? products : "0 (Need better selector)");
  
  // Also try to find all text containing €
  const euroItems = await page.evaluate(() => {
     return Array.from(document.querySelectorAll("*"))
       .filter(el => el.children.length === 0 && el.textContent?.includes("€"))
       .map(el => el.textContent?.trim())
       .slice(0, 10);
  });
  console.log("Euro items:", euroItems);
  
  await browser.close();
})();
