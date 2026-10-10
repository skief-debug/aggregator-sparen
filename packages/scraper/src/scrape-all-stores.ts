import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../apps/mobile/.env") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MARKTGURU_API_KEY = "8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=";
const MARKTGURU_CLIENT_KEY = "FtBfWwvvo8TcBpzGO5lHmTGi68ayFC/DTT4YPQuXcTA=";
const ZIP_CODE = "10115";
const LIMIT_PER_PAGE = 200;

const MG_HEADERS = {
  "x-apikey": MARKTGURU_API_KEY,
  "x-clientkey": MARKTGURU_CLIENT_KEY,
  origin: "https://www.marktguru.de",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  accept: "application/json",
};

const ALDI_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  accept: "application/json",
  "accept-language": "de-DE,de;q=0.9",
  origin: "https://www.aldi-sued.de",
  referer: "https://www.aldi-sued.de/de/angebote.html",
};

// Aldi Süd API config
const ALDI_SERVICE_POINT = "B384";
// All Aldi offer categories (Wochenangebote subcats + Dauerhaft günstig + Markenangebote)
const ALDI_OFFER_CATEGORIES = [
  "1588161427299187", // Frischeprodukte im Angebot
  "1588161427299188", // Eigenmarken im Angebot
  "1588161427299189", // Markenprodukte im Angebot
  "1588161425467260", // Dauerhaft günstig
  "1588161425467261", // Markenangebote
];

// Marktguru store configs (verified via /advertisers API)
const MG_STORE_CONFIGS = [
  { slug: "lidl",     marktguruId: 126679, name: "Lidl" },
  { slug: "penny",    marktguruId: 126765, name: "Penny" },
  { slug: "kaufland", marktguruId: 126654, name: "Kaufland" },
  { slug: "netto",    marktguruId: 126735, name: "Netto MD" },
];

// ─── Category Normalization ────────────────────────────────────────────────
// Maps Marktguru category names → our app categories
const CATEGORY_MAP: Record<string, string> = {
  // Obst & Gemüse
  "Äpfel": "Obst & Gemüse", "Birnen": "Obst & Gemüse", "Steinobst": "Obst & Gemüse",
  "Zitrusfrüchte": "Obst & Gemüse", "Weintrauben": "Obst & Gemüse", "Bananen": "Obst & Gemüse",
  "Beeren": "Obst & Gemüse", "Paprika": "Obst & Gemüse", "Tomaten": "Obst & Gemüse",
  "Gurken": "Obst & Gemüse", "Salate": "Obst & Gemüse", "Kräuter": "Obst & Gemüse",
  "Wurzelgemüse": "Obst & Gemüse", "Blattgemüse": "Obst & Gemüse", "Zwiebelgemüse": "Obst & Gemüse",
  "Kohl": "Obst & Gemüse", "Bohnen": "Obst & Gemüse",
  "Pilze": "Obst & Gemüse",
  // Fleisch & Fisch
  "Fleisch": "Fleisch & Fisch", "Geflügel": "Fleisch & Fisch", "Würste": "Fleisch & Fisch",
  "Koch- und Streichwurst": "Fleisch & Fisch", "mariniertes Fleisch": "Fleisch & Fisch",
  "Fisch": "Fleisch & Fisch", "Meeresfrüchte": "Fleisch & Fisch", "Fischkonserven": "Fleisch & Fisch",
  "Aufschnitt": "Fleisch & Fisch",
  // Milch & Käse
  "Milch": "Milch & Käse", "Käse": "Milch & Käse", "Joghurt": "Milch & Käse",
  "Butter": "Milch & Käse", "Haltbare Milch": "Milch & Käse",
  "Sahne, Schmand und Crème fraîche": "Milch & Käse", "Eier": "Milch & Käse",
  "Desserts": "Milch & Käse", "Quark": "Milch & Käse",
  // Getränke
  "Softdrinks": "Getränke", "Wasser": "Getränke", "Säfte": "Getränke",
  "Kaffee": "Getränke", "Tee": "Getränke", "Kakao": "Getränke",
  "Bier": "Getränke", "Alkoholfreies Bier": "Getränke", "Rotweine": "Getränke",
  "Weissweine": "Getränke", "Roseweine": "Getränke", "Sekt": "Getränke",
  "Weinmischgetränke": "Getränke", "Weinbrand": "Getränke", "Whiskey": "Getränke",
  "Weißer Rum": "Getränke", "Brauner Rum": "Getränke",
  // Süßes & Snacks
  "Schokoladen": "Süßes & Snacks", "Kekse": "Süßes & Snacks", "Kuchen & Feinbackwaren": "Süßes & Snacks",
  "Nüsse": "Süßes & Snacks", "Salzgebäck": "Süßes & Snacks", "Knabbereien": "Süßes & Snacks",
  "Eis": "Süßes & Snacks", "Schokoaufstrich": "Süßes & Snacks", "Süßwaren": "Süßes & Snacks",
  "Bonbons": "Süßes & Snacks",
  // Brot & Backwaren
  "Brot": "Brot & Backwaren", "Brötchen": "Brot & Backwaren",
  "Tiefkühlbackwaren & -feingebäck": "Brot & Backwaren", "Mehl": "Brot & Backwaren",
  "Backzutaten & -mischungen": "Brot & Backwaren",
  // Tiefkühl
  "Tiefkühlgerichte": "Tiefkühl", "Tiefkühlung": "Tiefkühl",
  "Tiefkühlpizza": "Tiefkühl", "Eiscreme": "Tiefkühl",
  // Haushalt & Pflege
  "Waschmittel": "Haushalt & Pflege", "Küchenrolle": "Haushalt & Pflege",
  "Toilettenpapier": "Haushalt & Pflege", "Taschentücher": "Haushalt & Pflege",
  "Reinigungsgeräte": "Haushalt & Pflege", "Reinigen": "Haushalt & Pflege",
  "Körperpflege": "Haushalt & Pflege", "Zahnpflege": "Haushalt & Pflege",
  // Non-Food (wird als is_non_food=true markiert)
  "Schuhe": "Non-Food", "Kinderschuhe": "Non-Food",
  "Kinder- und Babybekleidung": "Non-Food", "Kleidung": "Non-Food",
  "TV": "Non-Food", "Kaffeemaschinen": "Non-Food", "Küchengeräte": "Non-Food",
  "Küchenzubehör": "Non-Food", "Glasartikel": "Non-Food", "Essgeschirr": "Non-Food",
  "Akkuschrauber": "Non-Food", "Bohrmaschinen": "Non-Food", "Sägen": "Non-Food",
  "Sonstiges Handwerkzeug": "Non-Food", "Nähmaschinen": "Non-Food",
  "Heckenscheren": "Non-Food", "Rasenmäher": "Non-Food", "Batterien": "Non-Food",
  "Computerzubehör": "Non-Food", "Haustechnik": "Non-Food", "Matratzen": "Non-Food",
  "Holzspalter": "Non-Food", "Gartenbewässerung": "Non-Food",
  "Aufbewahrungsbehälter": "Non-Food",
  "Wäschenständer": "Non-Food", "Schreibwaren": "Non-Food",
  "Reinigungsgeräte (Non-Food)": "Non-Food",
  "Pflanzen": "Non-Food", "Blumen": "Non-Food", "Zimmerpflanzen": "Non-Food",
  
  // Neu hinzugefügt aus Marktguru/Aldi
  "Tiefkühlpizza & -flammkuchen": "Tiefkühl",
  "Tiefkühlpizza": "Tiefkühl",
  "Gewürzmischungen": "Sonstiges",
  "Hundefutter": "Non-Food", "Katzenfutter": "Non-Food", "Tiernahrung": "Non-Food",
  "Spülmittel": "Haushalt & Pflege",
  "Zahngesundheit": "Haushalt & Pflege",
  "Duschgel": "Haushalt & Pflege",
  "Deo": "Haushalt & Pflege",
  "Steaks": "Fleisch & Fisch", "Rindfleisch": "Fleisch & Fisch", "Schweinefleisch": "Fleisch & Fisch",
  "Geflügelfleisch": "Fleisch & Fisch",
};

const NON_FOOD_CATS = new Set([
  "Non-Food", "Schuhe", "Kinderschuhe", "Kinder- und Babybekleidung", "Kleidung",
  "TV", "Kaffeemaschinen", "Küchengeräte", "Küchenzubehör", "Glasartikel", "Essgeschirr",
  "Akkuschrauber", "Bohrmaschinen", "Sägen", "Sonstiges Handwerkzeug", "Nähmaschinen",
  "Heckenscheren", "Rasenmäher", "Batterien", "Computerzubehör", "Haustechnik",
  "Matratzen", "Holzspalter", "Gartenbewässerung", "Türbeschläge",
  "Aufbewahrungsbehälter", "Wäschenständer", "Schreibwaren",
  "Pflanzen", "Blumen", "Zimmerpflanzen",
]);

const ALCOHOL_CATS = new Set([
  "Bier", "Rotweine", "Weissweine", "Roseweine", "Sekt", "Weinmischgetränke",
  "Weinbrand", "Whiskey", "Weißer Rum", "Brauner Rum", "Spirituosen",
]);

function normalizeCategory(rawCat: string | null): string {
  if (!rawCat) return "Sonstiges";
  
  // 1. Exact Match
  if (CATEGORY_MAP[rawCat]) {
    return CATEGORY_MAP[rawCat];
  }

  // 2. Exact Match (Case-Insensitive)
  const lowerRaw = rawCat.toLowerCase().trim();
  for (const [key, mapped] of Object.entries(CATEGORY_MAP)) {
    if (key.toLowerCase() === lowerRaw) {
      return mapped;
    }
  }

  return "Sonstiges";
}

// ─── timing_tag ────────────────────────────────────────────────────────────
// Kaufland: Wed–Tue cycle. Some deals start Thu/Sat.
// We tag based on valid_from relative to today.
function computeTimingTag(validFrom: string, validTo: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(validFrom);
  from.setHours(0, 0, 0, 0);
  const to = new Date(validTo);
  to.setHours(23, 59, 59, 999);

  if (to < today) return "expired";
  if (from > today) {
    // Future — but within next 7 days = next_week, else upcoming
    const daysAhead = (from.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return daysAhead <= 7 ? "next_week" : "upcoming";
  }
  return "current_week";
}

// ─── discount_pct calculation ──────────────────────────────────────────────
function calcDiscountPct(price: number, originalPrice: number | null): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

// ─── Marktguru Scraping ────────────────────────────────────────────────────
async function fetchMGPage(advertiserId: number, offset: number): Promise<any[]> {
  const url = `https://api.marktguru.de/api/v1/offers?advertiserId=${advertiserId}&limit=${LIMIT_PER_PAGE}&offset=${offset}&zipCode=${ZIP_CODE}`;
  const res = await fetch(url, { headers: MG_HEADERS });
  if (!res.ok) throw new Error(`MG API ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function fetchAllMGOffers(advertiserId: number, storeName: string): Promise<any[]> {
  const countRes = await fetch(
    `https://api.marktguru.de/api/v1/offers?advertiserId=${advertiserId}&limit=1&zipCode=${ZIP_CODE}`,
    { headers: MG_HEADERS }
  );
  const countData = await countRes.json();
  const total = countData.totalResults || 0;
  console.log(`  📊 ${storeName}: ${total} total on Marktguru`);
  if (total === 0) return [];

  const pagesToFetch = Math.ceil(total / LIMIT_PER_PAGE);
  let all: any[] = [];
  for (let p = 0; p < pagesToFetch; p++) {
    console.log(`  📄 Page ${p + 1}/${pagesToFetch}...`);
    const offers = await fetchMGPage(advertiserId, p * LIMIT_PER_PAGE);
    all = all.concat(offers);
    await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

function mapMGOfferToDb(offer: any, storeId: string): object {
  const validFrom = offer.validityDates?.[0]?.from || new Date().toISOString();
  const validTo = offer.validityDates?.[0]?.to || new Date(Date.now() + 7 * 86400000).toISOString();

  const brandName = offer.brand
    ? typeof offer.brand === "string" ? offer.brand : offer.brand.name
    : null;
  const productName = offer.product?.name || null;

  let title = offer.description || "Angebot";
  title = title.replace(/^HINWEIS:\s*/i, "").replace(/^MIT\s+\w+\s+APP[^,]+(,\s*)?/i, "").trim();
  if (productName && brandName) title = `${brandName} ${productName}`;
  else if (productName) title = productName;

  const rawCat = offer.categories?.[0]?.name || null;
  const normalCat = normalizeCategory(rawCat);
  const isNonFood = NON_FOOD_CATS.has(rawCat || "") || normalCat === "Non-Food";
  const isAlcohol = ALCOHOL_CATS.has(rawCat || "");

  const currentPrice = offer.price;
  const originalPrice = sanitizeMGOldPrice(offer);
  const discountPct = calcDiscountPct(currentPrice, originalPrice);
  const timingTag = computeTimingTag(validFrom, validTo);

  // Extract price per unit if available
  let pricePerUnitLabel = null;
  if (offer.referencePrice != null && offer.unit?.shortName) {
    let unit = offer.unit.shortName;
    if (unit.toLowerCase() === 'kg') unit = '1 kg';
    else if (unit.toLowerCase() === 'l') unit = '1 l';
    pricePerUnitLabel = `${offer.referencePrice.toFixed(2).replace('.', ',')} € / ${unit}`;
  }

  // App-exclusive detection
  const combinedText = `${offer.description || ""} ${offer.product?.description || ""}`.toLowerCase();
  const isAppExclusive = ["lidl plus", "penny app", "kaufland card", "netto plus", "mit app"].some(kw => combinedText.includes(kw));

  return {
    store_id: storeId,
    title: title.substring(0, 255),
    brand: brandName ? String(brandName).substring(0, 100) : null,
    price: currentPrice,
    original_price: originalPrice,
    price_per_unit_label: pricePerUnitLabel,
    discount_pct: discountPct,
    image_url: `https://cdn.marktguru.de/api/v1/offers/${offer.id}/images/default/0/medium.webp`,
    valid_from: validFrom.substring(0, 10), // date only
    valid_to: validTo.substring(0, 10),
    timing_tag: timingTag,
    category: normalCat,
    is_non_food: isNonFood,
    is_alcohol: isAlcohol,
    is_app_exclusive: isAppExclusive,
    scraped_at: new Date().toISOString(),
  };
}

function sanitizeMGOldPrice(offer: any): number | null {
  const old = offer.oldPrice;
  const cur = offer.price;
  if (!old || !cur) return null;
  if (old > cur * 5) return null; // unit price masquerading
  if ((old - cur) / old > 0.9) return null; // >90% discount = suspect
  if (old <= cur) return null;
  return old;
}

// ─── Aldi Süd Scraping ────────────────────────────────────────────────────
async function fetchAldiCategory(categoryKey: string): Promise<any[]> {
  const VALID_LIMIT = 60;
  let offset = 0;
  let total = Infinity;
  const all: any[] = [];

  while (offset < total) {
    const url = `https://api.aldi-sued.de/v3/product-search?currency=EUR&serviceType=walk-in&limit=${VALID_LIMIT}&offset=${offset}&servicePoint=${ALDI_SERVICE_POINT}&categoryKey=${categoryKey}`;
    const res = await fetch(url, { headers: ALDI_HEADERS });
    if (!res.ok) { console.error(`  ❌ Aldi API ${res.status} for cat ${categoryKey}`); break; }
    const data = await res.json();
    total = data.meta?.pagination?.totalCount ?? 0;
    const items: any[] = data.data ?? [];
    if (items.length === 0) break;
    all.push(...items);
    offset += VALID_LIMIT;
    await new Promise((r) => setTimeout(r, 150));
  }
  return all;
}

function mapAldiItemToDb(item: any, storeId: string): object | null {
  const priceAmount = item.price?.amount;
  if (priceAmount == null) return null;

  const currentPrice = priceAmount / 100;
  const wasPriceStr = item.price?.wasPriceDisplay;
  let originalPrice: number | null = null;
  if (wasPriceStr) {
    const parsed = parseFloat(wasPriceStr.replace(" €", "").replace(",", "."));
    if (!isNaN(parsed) && parsed > currentPrice && parsed < currentPrice * 5) {
      originalPrice = parsed;
    }
  }

  const discountPct = item.price?.savingsDisplay
    ? parseInt(item.price.savingsDisplay.replace("%", "").trim(), 10) || calcDiscountPct(currentPrice, originalPrice)
    : calcDiscountPct(currentPrice, originalPrice);

  const assetUrl = item.assets?.[0]?.url ?? null;
  const imageUrl = assetUrl
    ? assetUrl.replace("{width}", "400").replace("{slug}", item.urlSlugText ?? "")
    : "";

  const title = item.brandName ? `${item.brandName} ${item.name}` : item.name;

  // Aldi doesn't give us validity dates in the product API, use current week
  const validFrom = new Date().toISOString().substring(0, 10);
  const validTo = new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);

  // Aldi categories come as array of objects
  const rawCat = item.categories?.[0]?.name || null;
  const normalCat = normalizeCategory(rawCat);
  const isNonFood = NON_FOOD_CATS.has(rawCat || "") || normalCat === "Non-Food";
  const isAlcohol = ALCOHOL_CATS.has(rawCat || "");

  const pricePerUnitLabel = item.price?.comparisonDisplay || null;

  return {
    store_id: storeId,
    title: title.substring(0, 255),
    brand: item.brandName ? item.brandName.substring(0, 100) : null,
    price: currentPrice,
    original_price: originalPrice,
    price_per_unit_label: pricePerUnitLabel,
    discount_pct: discountPct > 0 ? discountPct : null,
    image_url: imageUrl,
    valid_from: validFrom,
    valid_to: validTo,
    timing_tag: "current_week",
    category: normalCat,
    is_non_food: isNonFood,
    is_alcohol: isAlcohol,
    is_app_exclusive: false,
    scraped_at: new Date().toISOString(),
  };
}

async function scrapeAldiSued(storeId: string): Promise<object[]> {
  const allItems = new Map<string, object>(); // deduplicate by SKU

  for (const catKey of ALDI_OFFER_CATEGORIES) {
    console.log(`  📦 Fetching Aldi category ${catKey}...`);
    const items = await fetchAldiCategory(catKey);
    console.log(`    → ${items.length} items`);
    for (const item of items) {
      if (!allItems.has(item.sku)) {
        const deal = mapAldiItemToDb(item, storeId);
        if (deal) allItems.set(item.sku, deal);
      }
    }
  }

  console.log(`  ✅ ${allItems.size} unique Aldi deals after deduplication`);
  return Array.from(allItems.values());
}

// ─── Deduplication ─────────────────────────────────────────────────────────
// Groups products by their brand + first word of base title + price to remove flavor variations
// e.g. "funny-frisch Chipsfrisch ungarisch 150g" and "funny-frisch Chipsfrisch gesalzen 150g" will merge
function deduplicateDeals(deals: any[]): any[] {
  const unique = new Map<string, any>();
  for (const deal of deals) {
    let baseTitle = (deal.title || "").toLowerCase();
    const brand = (deal.brand || "").toLowerCase();
    
    if (brand && baseTitle.includes(brand)) {
      let remaining = baseTitle.replace(brand, "").trim();
      if (remaining) {
        const firstWord = remaining.split(' ')[0].trim();
        baseTitle = `${brand}_${firstWord}`;
      }
    } else {
      baseTitle = baseTitle.split(',')[0].trim();
    }

    const key = `${deal.store_id}_${baseTitle}_${deal.price}`;
    if (!unique.has(key)) {
      unique.set(key, deal);
    }
  }
  return Array.from(unique.values());
}

// ─── DB insert helper ─────────────────────────────────────────────────────
async function insertDeals(deals: object[]): Promise<number> {
  const BATCH = 100;
  let total = 0;
  for (let i = 0; i < deals.length; i += BATCH) {
    const batch = deals.slice(i, i + BATCH);
    const { error } = await supabase.from("deals").insert(batch);
    if (error) {
      console.error(`  ❌ Insert error batch ${Math.floor(i / BATCH) + 1}:`, error.message);
    } else {
      total += batch.length;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`  💾 Inserted ${total}/${deals.length}`);
  return total;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
async function run() {
  console.log("🚀 aggreGATOR Scraper v2 — All Stores\n");

  const { data: dbStores, error } = await supabase.from("stores").select("*");
  if (error || !dbStores) { console.error("❌ DB error:", error); return; }

  const storeMap = new Map<string, string>(dbStores.map((s) => [s.slug, s.id]));
  console.log("🏪 Stores:", dbStores.map(s => s.name).join(", "));

  // Wipe all deals
  console.log("\n🗑️  Wiping existing deals...");
  await supabase.from("deals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✅ Done\n");

  let grandTotal = 0;

  // ── Marktguru stores ──
  for (const cfg of MG_STORE_CONFIGS) {
    const storeId = storeMap.get(cfg.slug);
    if (!storeId) { console.log(`⚠️  ${cfg.slug} not in DB`); continue; }

    console.log(`\n🏬 ${cfg.name} (MG ID: ${cfg.marktguruId})`);
    const rawOffers = await fetchAllMGOffers(cfg.marktguruId, cfg.name);

    const dealsMap = new Map<string, object>();
    for (const offer of rawOffers) {
      if (offer.price != null && offer.id) {
        dealsMap.set(String(offer.id), mapMGOfferToDb(offer, storeId));
      }
    }
    const deals = Array.from(dealsMap.values());
    const dedupedDeals = deduplicateDeals(deals);
    console.log(`  ✅ ${rawOffers.length} raw → ${deals.length} unique MG deals → ${dedupedDeals.length} deduped (flavors merged)`);
    grandTotal += await insertDeals(dedupedDeals);
  }

  // ── Aldi Süd ──
  const aldiId = storeMap.get("aldi");
  if (aldiId) {
    console.log("\n🏬 Aldi Süd (via api.aldi-sued.de, all offer categories)");
    const aldiDeals = await scrapeAldiSued(aldiId);
    const dedupedAldiDeals = deduplicateDeals(aldiDeals);
    console.log(`  ✅ ${aldiDeals.length} unique Aldi deals → ${dedupedAldiDeals.length} deduped (flavors merged)`);
    grandTotal += await insertDeals(dedupedAldiDeals);
  }

  console.log(`\n🎉 Grand total inserted: ${grandTotal} deals`);
  console.log("📊 Summary by timing_tag can be checked via Supabase dashboard.");
}

run();
