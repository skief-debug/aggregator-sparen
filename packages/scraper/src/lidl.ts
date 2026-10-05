import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

chromium.use(stealth());

// Load environment variables from the apps/mobile/.env file
dotenv.config({ path: path.resolve(__dirname, "../../../apps/mobile/.env") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LIDL_STORE_ID = "9720865a-3cbc-4150-88e6-cbd093ffe961";

function categorizeProduct(title: string): string {
  const t = title.toLowerCase();
  
  if (t.match(/fleisch|hähnchen|rind|schwein|wurst|salami|schinken|fisch|lachs|schnitzel/)) {
    return 'Fleisch & Fisch';
  }
  if (t.match(/milch|käse|joghurt|butter|sahne|quark|mozzarella|gouda/)) {
    return 'Milch & Käse';
  }
  if (t.match(/apfel|banane|trauben|tomaten|gurke|paprika|kartoffel|zwiebel|salat|beeren|obst|gemüse|avocado/)) {
    return 'Obst & Gemüse';
  }
  if (t.match(/cola|fanta|sprite|saft|wasser|bier|wein|kaffee|energy|drink/)) {
    return 'Getränke';
  }
  if (t.match(/chips|schokolade|gummibärchen|keks|pringles|snack|nuss|eis/)) {
    return 'Snacks';
  }
  if (t.match(/pizza|pommes|tiefkühl|tk-/)) {
    return 'Tiefkühl';
  }
  if (t.match(/waschmittel|klopapier|küchenrolle|shampoo|duschgel|zahncreme|deo|reiniger/)) {
    return 'Non-Food';
  }
  
  return 'Sonstiges'; // Fallback if no keywords match
}

async function runScraper() {
  console.log("🚀 Starte Real Lidl Scraper (Stealth Mode)...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    const url = "https://www.lidl.de/c/essen-trinken/s10068374";
    console.log(`🌍 Navigiere zu ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Handle cookie banner (Accept if it exists)
    try {
      const cookieButton = page.locator('button#onetrust-accept-btn-handler');
      await cookieButton.waitFor({ state: "visible", timeout: 10000 });
      console.log("🍪 Akzeptiere Cookies...");
      await cookieButton.click();
    } catch (e) {
      console.log("ℹ️ Kein Cookie-Banner gefunden oder bereits akzeptiert.");
    }

    // Scroll down to load lazy images and products
    console.log("📜 Lade dynamische Inhalte (Warte 5 Sekunden)...");
    await page.waitForTimeout(5000);
    
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(1000);
    }

    // Extract product tiles
    console.log("🔎 Suche nach Produkt-Kacheln...");
    const products = await page.evaluate(() => {
      // Find all elements that contain a € symbol
      const results: any[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      
      let node;
      while (node = walker.nextNode()) {
        if (node.nodeValue && node.nodeValue.includes("€")) {
          // Found a price text node, traverse up to find the container
          let container: HTMLElement | null = node.parentElement;
          while (container && container.textContent && container.textContent.length < 300) {
            container = container.parentElement;
          }
          
          if (container && !results.some(r => r.container === container)) {
            const text = container.innerText || "";
            const imgEl = container.querySelector("img");
            const imageUrl = imgEl?.src || imgEl?.getAttribute("data-src") || "";
            
            if (imageUrl) {
              const priceMatch = text.match(/(\d+)[,\.](\d{2})/);
              let price = null;
              if (priceMatch) {
                 price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
              }
              
              // Find a title (usually an h3, h2, or strong)
              let title = "";
              const heading = container.querySelector("h2, h3, h4, strong");
              if (heading && heading.textContent) {
                 title = heading.textContent.trim();
              } else {
                 title = text.split("\n")[0].substring(0, 80).trim();
              }
              
              results.push({
                container,
                title,
                imageUrl,
                price
              });
            }
          }
        }
      }
      
      // Clean up DOM references before returning to node
      return results.map(r => ({ title: r.title, imageUrl: r.imageUrl, price: r.price }));
    });

    console.log(`✅ ${products.length} potenzielle Produkte gefunden!`);
    
    // Filter out invalid ones
    const validDeals = products.filter(p => p.price !== null && p.price > 0 && p.imageUrl.startsWith("http"));
    console.log(`✅ ${validDeals.length} gültige Deals nach Filterung.`);
    
    if (validDeals.length > 0) {
      console.log(`⬇️ Pushe ${validDeals.length} Deals nach Supabase...`);
      
      const dealsToInsert = validDeals.map((deal: any) => ({
        store_id: LIDL_STORE_ID,
        title: deal.title,
        description: "Lidl Angebot (Auto-Scraped)",
        price: deal.price,
        original_price: null,
        image_url: deal.imageUrl,
        category: categorizeProduct(deal.title), // <-- Auto Categorization
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 Days
      }));

      const { data, error } = await supabase
        .from("deals")
        .upsert(dealsToInsert, { onConflict: 'store_id, title' });

      if (error) {
        console.error("❌ Fehler beim Einfügen in Supabase:", error);
      } else {
        console.log("✅ Erfolgreich in Supabase eingefügt!");
      }
    } else {
      console.log("⚠️ Keine gültigen Deals gefunden.");
    }

  } catch (error) {
    console.error("❌ Fehler beim Scraping:", error);
  } finally {
    await browser.close();
  }
}

runScraper();
