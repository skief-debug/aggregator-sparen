import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Deal, supabase } from './supabase';
export type { Deal }; // re-export so consumers only import from store

// --- Filter State ---
export type Category =
  | 'Alle'
  | 'Obst & Gemüse'
  | 'Fleisch & Fisch'
  | 'Milch & Käse'
  | 'Getränke'
  | 'Süßes & Snacks'
  | 'Brot & Backwaren'
  | 'Tiefkühl'
  | 'Haushalt & Pflege'
  | 'Non-Food';

export type StoreSlug = 'alle' | 'lidl' | 'aldi' | 'penny' | 'netto' | 'kaufland';

export type TimingFilter = 'ALLE' | 'MO_SA' | 'FROM_DO' | 'SATURDAY_ONLY';

export type SortOption = 'discount_desc' | 'price_asc' | 'price_desc' | 'rarity';

export type FilterState = {
  activeStores: StoreSlug[];
  activeCategory: Category;
  activeTiming: TimingFilter;
  minDiscountPct: number;       // 0 = kein Filter
  hideNonFood: boolean;
  hideJunkFood: boolean;
  hideAlcohol: boolean;
  activeLifestyleTags: string[]; // 'High Protein', 'Low Carb', ...
  sortBy: SortOption;
  searchQuery: string;
};

// --- Shopping List ---
export type ShoppingListEntry = {
  id: string;
  deal: Deal;
  quantity: number;
  checked: boolean;
  addedAt: string;
};

const DEFAULT_FILTERS: FilterState = {
  activeStores: ['lidl', 'aldi', 'penny', 'kaufland', 'netto'],
  activeCategory: 'Alle',
  activeTiming: 'MO_SA',
  minDiscountPct: 0,
  hideNonFood: true,   // Standard: Non-Food ausgeblendet (USP!)
  hideJunkFood: false,
  hideAlcohol: false,
  activeLifestyleTags: [],
  sortBy: 'discount_desc',
  searchQuery: '',
};

const PAGE_SIZE = 120;

// --- Store ---
type SparGatorStore = {
  // Deals (Server State)
  deals: Deal[];
  isLoadingDeals: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
  fetchDeals: () => Promise<void>;        // fresh load (clears existing)
  loadMoreDeals: () => Promise<void>;     // append next page

  // Filter
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;

  // Shopping List (lokal, kein Backend für MVP)
  shoppingList: ShoppingListEntry[];
  addToList: (deal: Deal) => void;
  removeFromList: (id: string) => void;
  toggleChecked: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearList: () => void;

  // Favorites
  favoriteStores: string[];
  toggleFavoriteStore: (storeName: string) => void;
};

// Build Supabase query with active filters applied server-side
const DEAL_COLUMNS = [
  'id', 'store_id', 'title', 'brand', 'price', 'original_price',
  'discount_pct', 'image_url', 'valid_from', 'valid_to', 'timing_tag',
  'category', 'tags', 'price_per_unit_label', 'is_app_exclusive', 'is_non_food',
  'store_name', 'store_slug', 'store_color', 'store_text_color',
].join(', ');

let _filterFetchTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleFetch(fn: () => void, delay = 200) {
  if (_filterFetchTimer) clearTimeout(_filterFetchTimer);
  _filterFetchTimer = setTimeout(fn, delay);
}

function buildDealsQuery(filters: FilterState, withCount = false) {
  let q = supabase
    .from('deals_with_store')
    .select(DEAL_COLUMNS, withCount ? { count: 'exact' } : undefined)
    .order('category_order', { ascending: true })
    .order('timing_tag', { ascending: true })
    .order('discount_pct', { ascending: false, nullsFirst: false })
    .order('valid_from', { ascending: false })
    .order('id', { ascending: true });

  // Store filter
  if (filters.activeStores.length > 0 && !filters.activeStores.includes('alle')) {
    q = q.in('store_slug', filters.activeStores);
  }

  // Category filter
  if (filters.activeCategory && filters.activeCategory !== 'Alle') {
    q = q.eq('category', filters.activeCategory);
  }

  // Search query / Subcategory filter (supports multiple comma-separated terms)
  if (filters.searchQuery) {
    const terms = filters.searchQuery.split(',').map(t => t.trim()).filter(Boolean);
    if (terms.length > 0) {
      const orClauses = terms.map(term => {
        const t = `%${term}%`;
        return `title.ilike.${t},brand.ilike.${t},category.ilike.${t}`;
      });
      q = q.or(orClauses.join(','));
    }
  }

  // Timing filter
  if (filters.activeTiming && filters.activeTiming !== 'ALLE') {
    // Map to timing_tag values stored in DB
    if (filters.activeTiming === 'MO_SA') {
      q = q.eq('timing_tag', 'current_week');
    } else if (filters.activeTiming === 'FROM_DO') {
      q = q.in('timing_tag', ['current_week', 'next_week']);
    } else if (filters.activeTiming === 'SATURDAY_ONLY') {
      q = q.eq('timing_tag', 'next_week');
    }
  } else {
    // By default only show current + next week (not expired, not far future)
    q = q.in('timing_tag', ['current_week', 'next_week']);
  }

  // Non-food filter
  if (filters.hideNonFood) {
    q = q.eq('is_non_food', false);
  }

  // Junk food filter
  if (filters.hideJunkFood) {
    q = q.eq('is_junk_food', false);
  }

  // Alcohol filter
  if (filters.hideAlcohol) {
    q = q.eq('is_alcohol', false);
  }

  // Min discount filter
  if (filters.minDiscountPct > 0) {
    q = q.gte('discount_pct', filters.minDiscountPct);
  }

  return q;
}

function mapRow(row: any): Deal {
  return {
    ...row,
    store: {
      id: row.store_id,
      name: row.store_name,
      slug: row.store_slug,
      logo_url: null,
      primary_color: row.store_color,
      text_color: row.store_text_color,
    },
  };
}

function deduplicateDeals(deals: Deal[]): Deal[] {
  const seenIds = new Set<string>();
  const seen = new Set<string>();
  return deals.filter(deal => {
    // Unique by ID first
    if (seenIds.has(deal.id)) return false;
    seenIds.add(deal.id);

    // Wenn keine Marke bekannt ist, nicht gruppieren
    if (!deal.brand) return true;
    
    // Gruppierungsschlüssel: Store + Marke + Preis + Kategorie
    const key = `${deal.store_id}-${deal.brand}-${deal.price}-${deal.category}`;
    if (seen.has(key)) return false;
    
    seen.add(key);
    return true;
  });
}

export const useSparGatorStore = create<SparGatorStore>()(
  persist(
    (set, get) => ({
      // Deals
      deals: [],
      isLoadingDeals: false,
      isLoadingMore: false,
      hasMore: true,
      currentPage: 0,
      totalCount: 0,

      fetchDeals: async () => {
        const { filters } = get();
        set({ isLoadingDeals: true, currentPage: 0, deals: [], hasMore: true, totalCount: 0 });
        try {
          // wir rufen die daten UND den count ab
          const { data, count, error } = await buildDealsQuery(filters, true).range(0, PAGE_SIZE - 1);
          if (error) { console.error('fetchDeals error:', error); return; }
          const mapped = (data || []).map(mapRow);
          const deduped = deduplicateDeals(mapped);
          set({
            deals: deduped,
            currentPage: 1,
            hasMore: (data || []).length === PAGE_SIZE,
            totalCount: count || 0,
          });
        } catch (e) {
          console.error('fetchDeals failed', e);
        } finally {
          set({ isLoadingDeals: false });
        }
      },

      loadMoreDeals: async () => {
        const { isLoadingMore, hasMore, currentPage, filters, deals } = get();
        if (isLoadingMore || !hasMore) return;
        set({ isLoadingMore: true });
        try {
          const from = currentPage * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await buildDealsQuery(filters).range(from, to);
          if (error) { console.error('loadMoreDeals error:', error); return; }
          const mapped = (data || []).map(mapRow);
          const deduped = deduplicateDeals([...deals, ...mapped]);
          set({
            deals: deduped,
            currentPage: currentPage + 1,
            hasMore: (data || []).length === PAGE_SIZE,
          });
        } catch (e) {
          console.error('loadMoreDeals failed', e);
        } finally {
          set({ isLoadingMore: false });
        }
      },

      // Filter — setFilter triggers a fresh fetch so results always match
      // Uses debounce to prevent race conditions from rapid filter changes
      filters: DEFAULT_FILTERS,
      setFilter: (key, value) => {
        set((state) => ({ filters: { ...state.filters, [key]: value } }));
        scheduleFetch(() => get().fetchDeals());
      },
      resetFilters: () => {
        set({ filters: DEFAULT_FILTERS });
        scheduleFetch(() => get().fetchDeals());
      },

      // Shopping List
      shoppingList: [],

      addToList: (deal) => {
        const existing = get().shoppingList.find((e) => e.deal.id === deal.id);
        if (existing) {
          set((state) => ({
            shoppingList: state.shoppingList.map((e) =>
              e.deal.id === deal.id
                ? { ...e, quantity: e.quantity + 1 }
                : e
            ),
          }));
        } else {
          set((state) => ({
            shoppingList: [
              ...state.shoppingList,
              {
                id: `${deal.id}_${Date.now()}`,
                deal,
                quantity: 1,
                checked: false,
                addedAt: new Date().toISOString(),
              },
            ],
          }));
        }
      },

      removeFromList: (id) =>
        set((state) => ({
          shoppingList: state.shoppingList.filter((e) => e.id !== id),
        })),

      toggleChecked: (id) =>
        set((state) => ({
          shoppingList: state.shoppingList.map((e) =>
            e.id === id ? { ...e, checked: !e.checked } : e
          ),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          shoppingList: state.shoppingList.map((e) =>
            e.id === id ? { ...e, quantity } : e
          ),
        })),

      clearList: () => set({ shoppingList: [] }),

      // Favorites
      favoriteStores: [],
      toggleFavoriteStore: (storeName) =>
        set((state) => {
          const isFav = state.favoriteStores.includes(storeName);
          return {
            favoriteStores: isFav
              ? state.favoriteStores.filter((name) => name !== storeName)
              : [...state.favoriteStores, storeName],
          };
        }),
    }),
    {
      name: 'spargator-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selektoren
export const selectFilteredDeals = (deals: Deal[], filters: FilterState) => {
  if (!deals) return [];
  
  const activeStores = filters?.activeStores || [];
  const activeLifestyleTags = filters?.activeLifestyleTags || [];

  let filtered = [...deals].filter((deal) => {
    if (activeStores.length > 0 && deal.store?.slug) {
      if (!activeStores.includes(deal.store.slug as StoreSlug) && !activeStores.includes('alle')) {
        return false;
      }
    }
    if (filters?.activeCategory && filters.activeCategory !== 'Alle' && deal.category !== filters.activeCategory) return false;
    if (filters?.hideNonFood && deal.is_non_food) return false;
    if (filters?.hideJunkFood && deal.is_junk_food) return false;
    if (filters?.hideAlcohol && deal.is_alcohol) return false;
    if (filters?.minDiscountPct && filters.minDiscountPct > 0 && (deal.discount_pct ?? 0) < filters.minDiscountPct) return false;
    if (filters?.activeTiming && filters.activeTiming !== 'ALLE' && deal.timing_tag !== filters.activeTiming) return false;
    if (filters?.searchQuery) {
      const terms = filters.searchQuery.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
      if (terms.length > 0) {
        const matchesAny = terms.some(term => {
          return (
            deal.title?.toLowerCase().includes(term) ||
            deal.brand?.toLowerCase().includes(term) ||
            deal.category?.toLowerCase().includes(term) ||
            deal.tags?.some(tag => tag.toLowerCase().includes(term))
          );
        });
        if (!matchesAny) return false;
      }
    }
    if (activeLifestyleTags.length > 0) {
      const dealTags = deal.tags ?? [];
      if (!activeLifestyleTags.some((t) => dealTags.includes(t))) return false;
    }
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (filters?.sortBy === 'discount_desc') {
      return (b.discount_pct ?? 0) - (a.discount_pct ?? 0);
    } else if (filters?.sortBy === 'price_asc') {
      return (a.price ?? 999) - (b.price ?? 999);
    } else if (filters?.sortBy === 'price_desc') {
      return (b.price ?? 0) - (a.price ?? 0);
    }
    // 'rarity' would require more data, default to order by id or something else
    return 0;
  });

  return filtered;
};
