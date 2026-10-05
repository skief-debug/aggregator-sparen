import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto("https://www.marktguru.de/", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.fill('input[type="text"]', 'lidl');
    await page.waitForTimeout(5000);
    
    const links = await page.evaluate(() => {
       return Array.from(document.querySelectorAll('a')).map(a => a.href);
    });
    console.log("Found links:", links.filter(l => l.toLowerCase().includes('lidl')));
  } catch(e) {
    console.log("Error:", e.message);
  }
  
  await browser.close();
})();
