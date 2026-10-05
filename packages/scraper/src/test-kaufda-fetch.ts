import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto("https://www.kaufda.de/Geschaefte/Lidl", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000); // Wait for Cloudflare to pass
  
  try {
    const data = await page.evaluate(async () => {
      // Find the endpoint used by KaufDa to get offers. Usually it's something like /api/offers or similar.
      // Let's just do a search query
      const res = await fetch("https://www.kaufda.de/api/content/v1/search?query=lidl&limit=10");
      if(res.ok) {
         return await res.json();
      }
      return { error: res.statusText };
    });
    console.log("KaufDa Fetch Result:", JSON.stringify(data).substring(0, 500));
  } catch(e) {
    console.log("Error:", e.message);
  }
  
  await browser.close();
})();
