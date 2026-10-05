import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from the apps/mobile/.env file
dotenv.config({ path: path.resolve(__dirname, "../../../apps/mobile/.env") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const LIDL_STORE_ID = "9720865a-3cbc-4150-88e6-cbd093ffe961"; // Aus deiner DB

async function seedMvpDeals() {
  console.log("🚀 Starte MVP Lidl Seeder (Echte Daten aus Screenshots)...");

  const deals = [
    {
      store_id: LIDL_STORE_ID,
      title: "Lätta Original",
      subtitle: "Je 450 g (Max. 24 Stück). Normalpreis: 2.29",
      price: 1.11,
      original_price: 2.29,
      image_url: "https://www.lidl.de/assets/gcp067f923c6b244d2d854dbfa0f8c85c3f.jpeg",
      valid_from: new Date("2026-08-20").toISOString(),
      valid_to: new Date("2026-08-22").toISOString(),
    },
    {
      store_id: LIDL_STORE_ID,
      title: "Milbona Bio & Bioland Joghurts",
      subtitle: "Auf alle Milbona Bio & Bioland Joghurts -15%",
      price: 0.85, // Beispielpreis
      original_price: 1.00,
      image_url: "https://www.lidl.de/assets/gcp29a239927d2c4b8e88e89cf241c28c89.jpeg",
      valid_from: new Date("2026-08-21").toISOString(),
      valid_to: new Date("2026-08-22").toISOString(),
    },
    {
      store_id: LIDL_STORE_ID,
      title: "Pom-Bär",
      subtitle: "Original oder Ketchup, 75g",
      price: 1.11,
      original_price: 1.89,
      image_url: "https://www.lidl.de/assets/gcp3d85d774f35848bb9910d54a6bba3edc.jpeg",
      valid_from: new Date("2026-08-20").toISOString(),
      valid_to: new Date("2026-08-24").toISOString(),
    },
    {
      store_id: LIDL_STORE_ID,
      title: "Deutsche Rote Äpfel",
      subtitle: "Süß-säuerlich, Klasse 1, 2-kg-Netz",
      price: 2.19,
      original_price: 2.99,
      image_url: "https://www.lidl.de/assets/gcp7fb462fc74b64ed38fcc9252efb2f155.jpeg",
      valid_from: new Date("2026-08-24").toISOString(),
      valid_to: new Date("2026-08-29").toISOString(),
    },
    {
      store_id: LIDL_STORE_ID,
      title: "Deutsche Heidelbeeren",
      subtitle: "Klasse 1, 125g Packung",
      price: 1.49,
      original_price: 1.99,
      image_url: "https://www.lidl.de/assets/gcp2a4d95bf71234479acccecc51d729a67.jpeg",
      valid_from: new Date("2026-08-24").toISOString(),
      valid_to: new Date("2026-08-29").toISOString(),
    },
    {
      store_id: LIDL_STORE_ID,
      title: "Minze, geschnitten",
      subtitle: "Ursprung: Deutschland, je 40g",
      price: 0.39,
      original_price: 0.79,
      image_url: "https://www.lidl.de/assets/gcp63c97dbbf8304ed098dbdf691a5e12be.jpeg",
      valid_from: new Date("2026-08-24").toISOString(),
      valid_to: new Date("2026-08-29").toISOString(),
    }
  ];

  console.log(`⬇️ Pushe ${deals.length} echte MVP-Deals nach Supabase...`);
  
  const { data, error } = await supabase
    .from("deals")
    .insert(deals);

  if (error) {
    console.error("❌ Fehler beim Einfügen in Supabase:", error);
  } else {
    console.log("✅ Erfolgreich in Supabase eingefügt!");
    console.log("Starte Expo Go, um das Ergebnis anzusehen!");
  }
}

seedMvpDeals();
