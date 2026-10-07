import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from the apps/mobile/.env file
dotenv.config({ path: path.resolve(__dirname, "../../../apps/mobile/.env") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Lidl Supabase Store ID (using the same one from lidl.ts)
const LIDL_STORE_ID = "9720865a-3cbc-4150-88e6-cbd093ffe961";

// Marktguru API Keys (found via interception)
const MARKTGURU_API_KEY = "8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=";
const MARKTGURU_CLIENT_KEY = "FtBfWwvvo8TcBpzGO5lHmTGi68ayFC/DTT4YPQuXcTA=";

const CATEGORY_MAPPING: Record<string, string> = {
  "Softdrinks": "Getränke", "Kaffee": "Getränke", "Säfte": "Getränke", "Bier": "Getränke", "Wein": "Getränke", "Spirituosen": "Getränke", "Wasser": "Getränke", "Energy": "Getränke",
  "Schokoladen": "Süßes & Snacks", "Salzgebäck": "Süßes & Snacks", "Kuchen & Feinbackwaren": "Süßes & Snacks", "Süßwaren": "Süßes & Snacks", "Knabberartikel": "Süßes & Snacks", "Chips": "Süßes & Snacks",
  "Käse": "Milch & Käse", "Milch": "Milch & Käse", "Joghurt": "Milch & Käse", "Butter": "Milch & Käse", "Sahne": "Milch & Käse", "Milcherzeugnisse": "Milch & Käse",
  "Fleisch": "Fleisch & Fisch", "Wurstwaren": "Fleisch & Fisch", "Geflügel": "Fleisch & Fisch", "Fisch": "Fleisch & Fisch", "Aufschnitt": "Fleisch & Fisch",
  "Obst": "Obst & Gemüse", "Gemüse": "Obst & Gemüse",
  "Drogerie": "Haushalt & Pflege", "Reinigungsmittel": "Haushalt & Pflege", "Körperpflege": "Haushalt & Pflege", "Waschmittel": "Haushalt & Pflege", "Hygiene": "Haushalt & Pflege",
  "Brot": "Brot & Backwaren", "Backwaren": "Brot & Backwaren", "Brötchen": "Brot & Backwaren",
  "Tiefkühlwaren": "Tiefkühl", "Tiefkühl": "Tiefkühl", "Eis": "Tiefkühl", "Pizza": "Tiefkühl"
};

function mapCategory(rawCat: string): string {
  if (!rawCat) return "Sonstiges";
  if (CATEGORY_MAPPING[rawCat]) return CATEGORY_MAPPING[rawCat];
  for (const [key, val] of Object.entries(CATEGORY_MAPPING)) {
    if (rawCat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "Sonstiges";
}

async function runScraper() {
  console.log("🚀 Starte Marktguru API Scraper...");
  
  try {
    const url = "https://api.marktguru.de/api/v1/offers?retailerIds=126679&limit=200&zipCode=19053";
    console.log(`🌍 Rufe Marktguru API auf: ${url}...`);
    
    const response = await fetch(url, {
      headers: {
        "x-apikey": MARKTGURU_API_KEY,
        "x-clientkey": MARKTGURU_CLIENT_KEY,
        "origin": "https://www.marktguru.de",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
      }
    });
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const offers = data.results || [];
    
    console.log(`✅ ${offers.length} Angebote von Marktguru geladen!`);
    
    if (offers.length > 0) {
      console.log(`⬇️ Bereite ${offers.length} Deals für Supabase vor...`);
      
      const dealsToInsert = offers.map((offer: any) => {
        // Find the image URL (usually in images.metadata)
        let imageUrl = "";
        if (offer.images?.metadata && offer.images.metadata.length > 0) {
           // We can reconstruct the CDN url for images if needed, or use the offer id
           // From website: https://cdn.marktguru.de/api/v1/offers/{offer.id}/images/default/0/medium.webp
           imageUrl = `https://cdn.marktguru.de/api/v1/offers/${offer.id}/images/default/0/medium.webp`;
        }
        
        let validFrom = new Date().toISOString();
        let validTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        if (offer.validityDates && offer.validityDates.length > 0) {
           validFrom = offer.validityDates[0].from || validFrom;
           validTo = offer.validityDates[0].to || validTo;
        }

        const brandName = offer.brand ? (typeof offer.brand === 'string' ? offer.brand : offer.brand.name) : null;
        
        let rawCategory = "Sonstiges";
        if (offer.categories && offer.categories.length > 0) {
          rawCategory = offer.categories[0].name;
        }

        const tags = [rawCategory];
        if (brandName) tags.push(brandName);

        return {
          store_id: LIDL_STORE_ID,
          title: offer.description ? offer.description.substring(0, 255) : "Unbekanntes Angebot",
          brand: brandName ? String(brandName).substring(0, 255) : null,
          price: offer.price,
          original_price: offer.oldPrice || offer.referencePrice || null,
          image_url: imageUrl,
          valid_from: validFrom,
          valid_to: validTo,
          category: mapCategory(rawCategory),
          tags: tags,
        };
      });

      // Filter out deals without price or title, and ensure uniqueness by title
      const uniqueDealsMap = new Map();
      dealsToInsert.forEach((d: any) => {
         if (d.price !== null && d.title) {
            uniqueDealsMap.set(d.title, d);
         }
      });
      const validDeals = Array.from(uniqueDealsMap.values());
      console.log(`✅ ${validDeals.length} eindeutige, gültige Deals nach Filterung.`);

      if (validDeals.length > 0) {
        // Fetch existing deals to manually upsert
        const { data: existingDeals, error: fetchError } = await supabase
          .from("deals")
          .select("id, title")
          .eq("store_id", LIDL_STORE_ID);
          
        if (fetchError) {
           console.error("❌ Fehler beim Abrufen bestehender Deals:", fetchError);
           return;
        }
        
        const existingMap = new Map(existingDeals?.map(d => [d.title, d.id]) || []);
        
        const toInsert = [];
        const toUpdate = [];
        
        for (const deal of validDeals) {
           const existingId = existingMap.get(deal.title);
           if (existingId) {
              toUpdate.push({ ...deal, id: existingId });
           } else {
              toInsert.push(deal);
           }
        }
        
        if (toInsert.length > 0) {
           const { error: insertError } = await supabase.from("deals").insert(toInsert);
           if (insertError) console.error("❌ Fehler beim Einfügen (Insert):", insertError);
           else console.log(`✅ ${toInsert.length} neue Deals eingefügt!`);
        }
        
        if (toUpdate.length > 0) {
           const { error: updateError } = await supabase.from("deals").upsert(toUpdate);
           if (updateError) console.error("❌ Fehler beim Aktualisieren (Upsert):", updateError);
           else console.log(`✅ ${toUpdate.length} bestehende Deals aktualisiert!`);
        }
      } else {
        console.log("⚠️ Keine gültigen Deals gefunden.");
      }
    } else {
      console.log("⚠️ Keine Deals gefunden.");
    }
  } catch (error) {
    console.error("❌ Fehler beim Scraping:", error);
  }
}

runScraper();
