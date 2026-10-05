const { chromium } = require('playwright');

const STORES = [
  { name: 'lidl', path: 'lidl' },
  { name: 'aldi', path: 'aldi-nord' },
  { name: 'penny', path: 'penny' },
  { name: 'kaufland', path: 'kaufland' },
  { name: 'netto', path: 'netto-marken-discount' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const retailerIds = {};

  for (const store of STORES) {
    console.log(`\n🔍 Intercepting retailer ID for: ${store.name}...`);
    const page = await browser.newPage();
    
    const foundIds = [];
    
    // Intercept all API requests
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('api.marktguru.de') && url.includes('retailerIds=')) {
        const match = url.match(/retailerIds=([^&]+)/);
        if (match) {
          foundIds.push(match[1]);
        }
      }
      // Also check for advertisementcollections with retailerIds
      if (url.includes('advertisementcollections') && url.includes('retailerIds=')) {
        const match = url.match(/retailerIds=([^&]+)/);
        if (match) foundIds.push('ADV:' + match[1]);
      }
    });

    // Also intercept responses to find offers 
    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('api.marktguru.de') && url.includes('offers') && url.includes('limit')) {
        try {
          const json = await res.json().catch(() => null);
          if (json && json.results && json.results.length > 0) {
            const retailer = json.results[0].advertisers?.[0];
            if (retailer) {
              console.log(`  📦 Found advertiser in offers response: ${JSON.stringify(retailer)}`);
            }
          }
        } catch(e) {}
      }
    });

    try {
      await page.goto(`https://www.marktguru.de/r/${store.path}`, { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
    } catch (e) {
      // timeout ok, we still get the requests
    }
    
    await page.waitForTimeout(3000);
    
    retailerIds[store.name] = [...new Set(foundIds)];
    console.log(`  ✅ ${store.name}: ${JSON.stringify(retailerIds[store.name])}`);
    
    await page.close();
  }

  console.log('\n🎯 FINAL RETAILER IDS MAP:');
  console.log(JSON.stringify(retailerIds, null, 2));
  
  await browser.close();
})();
