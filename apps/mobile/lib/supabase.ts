// Supabase Client für SparGator App
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Typen aus der Datenbank
export type Store = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  text_color: string;
};

export type Deal = {
  id: string;
  store_id: string;
  title: string;
  brand: string | null;
  subtitle: string | null;
  price: number;
  original_price: number | null;
  app_price: number | null;
  is_app_exclusive: boolean;
  unit: string | null;
  price_per_unit: number | null;
  price_per_unit_label: string | null; // z.B. "1,98 € / kg"
  discount_pct: number | null;
  valid_from: string;
  valid_to: string;
  timing_tag: 'MO_SA' | 'FROM_DO' | 'SATURDAY_ONLY' | 'PREVIEW' | 'current_week' | 'next_week' | 'expired' | 'upcoming' | null;
  image_url: string | null;
  category: string | null;
  tags: string[] | null;
  is_non_food: boolean;
  is_junk_food: boolean;
  is_alcohol: boolean;
  scraped_at: string;
  // Joined
  store?: Store;
};

export type ShoppingListItem = {
  id: string;
  deal_id: string;
  quantity: number;
  checked: boolean;
  added_at: string;
  deal?: Deal;
};
