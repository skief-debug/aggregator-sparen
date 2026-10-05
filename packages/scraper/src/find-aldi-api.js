const { chromium } = require('playwright');

// Try to intercept Aldi Süd's internal API calls
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const apiCalls = [];
  
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('api') || url.includes('json') || url.includes('offer') || url.includes('angebot')) {
      apiCalls.push({ url, method: req.method() });
    }
  });
  
  page.on('response', async (res) => {
    const url = res.url();
    if ((url.includes('api') || url.includes('json')) && url.includes('aldi')) {
      try {
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const json = await res.json().catch(() => null);
          if (json) console.log('JSON Response:', url, JSON.stringify(json).substring(0, 200));
        }
      } catch(e) {}
    }
  });
  
  await page.goto('https://www.aldi-sued.de/de/angebote.html', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  
  console.log('\nAll API/JSON calls:');
  apiCalls.forEach(c => console.log(c.method, c.url));
  
  await browser.close();
})();
