import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../apps/mobile/.env") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEMO_DEALS: any = {
  lidl: [
    { title: "Lätta Original", price: 1.11, original_price: 2.29, image_url: "https://www.lidl.de/assets/gcp067f923c6b244d2d854dbfa0f8c85c3f.jpeg" },
    { title: "Lidl Plus: Milbona Joghurt", price: 0.85, original_price: 1.00, image_url: "https://www.lidl.de/assets/gcp29a239927d2c4b8e88e89cf241c28c89.jpeg" },
    { title: "Pom-Bär", price: 1.11, original_price: 1.89, image_url: "https://www.lidl.de/assets/gcp3d85d774f35848bb9910d54a6bba3edc.jpeg" },
    { title: "Peanuts 200g (Kilopreis Fehler Test)", price: 2.00, original_price: 10.00, image_url: "https://via.placeholder.com/300x300.png?text=Peanuts" }
  ],
  aldi: [
    { title: "Milsani H-Milch 3,5%", price: 0.99, original_price: 1.19, image_url: "https://via.placeholder.com/300x300.png?text=Milsani" },
    { title: "Aldi Nord: Nussknacker Schokolade", price: 1.49, original_price: 1.79, image_url: "https://via.placeholder.com/300x300.png?text=Nussknacker" },
    { title: "Kürbiskerne", price: 2.49, original_price: 2.99, image_url: "https://via.placeholder.com/300x300.png?text=Kuerbisse" }
  ],
  penny: [
    { title: "Penny App: Cola 1,5L", price: 0.89, original_price: 1.49, image_url: "https://via.placeholder.com/300x300.png?text=Cola" },
    { title: "Bäckerkrönung Toast", price: 1.19, original_price: 1.49, image_url: "https://via.placeholder.com/300x300.png?text=Toast" },
    { title: "Naturgut Bio Eier", price: 2.99, original_price: 3.49, image_url: "https://via.placeholder.com/300x300.png?text=Eier" }
  ],
  kaufland: [
    { title: "K-Classic Orangensaft", price: 1.39, original_price: 1.69, image_url: "https://via.placeholder.com/300x300.png?text=OSaft" },
    { title: "Kaufland Card: Nutella 750g", price: 2.99, original_price: 4.59, image_url: "https://via.placeholder.com/300x300.png?text=Nutella" },
    { title: "Müller Milchreis", price: 0.39, original_price: 0.79, image_url: "https://via.placeholder.com/300x300.png?text=Milchreis" }
  ],
  netto: [
    { title: "Gutes Land Butter", price: 1.49, original_price: 2.29, image_url: "https://via.placeholder.com/300x300.png?text=Butter" },
    { title: "Netto Marken-Discount: Äpfel 2kg", price: 1.99, original_price: 2.99, image_url: "https://via.placeholder.com/300x300.png?text=Aepfel" }
  ]
};

async function seedAll() {
  console.log("🚀 Seeding Database with Clean MVP Deals...");
  const { data: dbStores, error: storesError } = await supabase.from('stores').select('*');
  if (storesError || !dbStores) {
    console.error("❌ DB Error", storesError); return;
  }
  
  let totalInserted = 0;
  for (const store of dbStores) {
    const deals = DEMO_DEALS[store.slug];
    if (!deals) continue;
    
    const dealsToInsert = deals.map((d: any) => ({
      ...d,
      store_id: store.id,
      valid_from: new Date().toISOString(),
      valid_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    
    const { error } = await supabase.from("deals").insert(dealsToInsert);
    if (!error) {
      console.log(`✅ Inserted ${deals.length} clean deals for ${store.name}`);
      totalInserted += deals.length;
    } else {
      console.error(`❌ Insert error for ${store.name}:`, error);
    }
  }
  console.log(`🎉 Seed complete! Inserted ${totalInserted} total deals.`);
}

seedAll();
