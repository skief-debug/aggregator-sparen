import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  AppState,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSparGatorStore, Category, TimingFilter, StoreSlug, Deal } from '@/lib/store';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SPACING = 10;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_SPACING * 3) / 2;
// Fixed card height for getItemLayout (image + details + padding)
const CARD_IMAGE_H = CARD_WIDTH;       // 1:1 aspect ratio
const CARD_DETAILS_H = 92;             // title(34) + price(22) + unit(16) + validity(14) + padding(6)
const CARD_H = CARD_IMAGE_H + CARD_DETAILS_H;
const ROW_H = CARD_H + GRID_SPACING;

// ─── Store config ──────────────────────────────────────────────────────────
const STORES = [
  { id: 'lidl' as StoreSlug,     name: 'Lidl',     color: '#0050AA' },
  { id: 'aldi' as StoreSlug,     name: 'Aldi',     color: '#00A3E0' },
  { id: 'penny' as StoreSlug,    name: 'Penny',    color: '#CC0000' },
  { id: 'kaufland' as StoreSlug, name: 'Kaufland', color: '#E10915' },
  { id: 'netto' as StoreSlug,    name: 'Netto',    color: '#E8A700' },
];

const STORE_COLOR: Record<string, string> = Object.fromEntries(
  STORES.map((s) => [s.id, s.color])
);

// ─── Timing options ────────────────────────────────────────────────────────
const TIMING_OPTIONS: { label: string; value: TimingFilter }[] = [
  { label: 'Diese Woche', value: 'MO_SA' },
  { label: 'Nächste Woche', value: 'SATURDAY_ONLY' },
  { label: 'Alle', value: 'ALLE' },
];

// ─── Category options ─────────────────────────────────────────────────────
const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'Alle', value: 'Alle', icon: '🏪' },
  { label: 'Obst & Gemüse', value: 'Obst & Gemüse', icon: '🥦' },
  { label: 'Fleisch & Fisch', value: 'Fleisch & Fisch', icon: '🥩' },
  { label: 'Milch & Käse', value: 'Milch & Käse', icon: '🥛' },
  { label: 'Getränke', value: 'Getränke', icon: '🧃' },
  { label: 'Süßes & Snacks', value: 'Süßes & Snacks', icon: '🍫' },
  { label: 'Brot & Backwaren', value: 'Brot & Backwaren', icon: '🍞' },
  { label: 'Tiefkühl', value: 'Tiefkühl', icon: '❄️' },
  { label: 'Haushalt & Pflege', value: 'Haushalt & Pflege', icon: '🧴' },
  { label: 'Non-Food', value: 'Non-Food', icon: '📦' },
];

const SUB_CATEGORIES: Record<string, string[]> = {
  'Obst & Gemüse': ['Tomaten', 'Äpfel', 'Bananen', 'Paprika', 'Salat', 'Kartoffeln', 'Gurken', 'Beeren'],
  'Fleisch & Fisch': ['Rind', 'Schwein', 'Hähnchen', 'Wurst', 'Fisch', 'Vegan'],
  'Milch & Käse': ['Milch', 'Käse', 'Joghurt', 'Quark', 'Butter', 'Sahne'],
  'Getränke': ['Wasser', 'Cola', 'Energy', 'Bier', 'Saft', 'Kaffee', 'Tee', 'Wein'],
  'Süßes & Snacks': ['Schokolade', 'Chips', 'Eis', 'Kekse', 'Nüsse', 'Gummibärchen'],
  'Brot & Backwaren': ['Brot', 'Brötchen', 'Toast', 'Kuchen'],
  'Tiefkühl': ['Pizza', 'Pommes', 'Eiscreme', 'Gemüse', 'Fertiggericht'],
  'Haushalt & Pflege': ['Waschmittel', 'Toilettenpapier', 'Duschgel', 'Zahnpasta', 'Reiniger'],
};

// ─── Utility: format validity label (outside render, no allocation per-render)
function formatValidityLabel(
  valid_from: string | null,
  valid_to: string | null,
  timing_tag: string
): string {
  if (!valid_to) return '';
  const to = new Date(valid_to);
  if (isNaN(to.getTime())) return '';
  const d = to.getDate().toString().padStart(2, '0');
  const m = (to.getMonth() + 1).toString().padStart(2, '0');
  let label = `bis ${d}.${m}.`;
  if (timing_tag === 'next_week' && valid_from) {
    const from = new Date(valid_from);
    if (!isNaN(from.getTime())) {
      const fd = from.getDate().toString().padStart(2, '0');
      const fm = (from.getMonth() + 1).toString().padStart(2, '0');
      label = `ab ${fd}.${fm}. · ${label}`;
    }
  }
  return label;
}

// ─── Deal Card ─────────────────────────────────────────────────────────────
// Props-based (no store access) + React.memo = re-renders only when props change
const DealCard = React.memo(({
  deal,
  isSaved,
  onToggleSave,
}: {
  deal: Deal;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}) => {
  const router = useRouter();
  const storeColor = STORE_COLOR[deal.store?.slug || (deal as any).store_slug] || '#334155';
  const isNextWeek = deal.timing_tag === 'next_week';
  const validityLabel = formatValidityLabel(deal.valid_from, deal.valid_to, deal.timing_tag ?? '');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/deal/${deal.id}`)}
    >
      {/* IMAGE */}
      <View style={styles.imageContainer}>
        <ExpoImage
          source={deal.image_url ? { uri: deal.image_url } : require('@/assets/images/icon.png')}
          style={styles.image}
          contentFit="contain"
          transition={100}
          cachePolicy="memory-disk"
        />

        {/* Store badge */}
        <View style={[styles.storeBadge, { backgroundColor: storeColor }]}>
          <Text style={styles.storeBadgeText}>
            {deal.store?.name || (deal as any).store_name || ''}
          </Text>
        </View>

        {/* Next-week badge */}
        {isNextWeek && (
          <View style={styles.nextWeekBadge}>
            <Text style={styles.nextWeekBadgeText}>Nächste Woche</Text>
          </View>
        )}

        {/* Discount badge */}
        {(deal.discount_pct ?? 0) > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{deal.discount_pct}%</Text>
          </View>
        )}

        {/* App-exclusive badge */}
        {deal.is_app_exclusive && (
          <View style={styles.appBadge}>
            <Ionicons name="phone-portrait-outline" size={8} color="#fff" />
            <Text style={styles.appBadgeText}>APP</Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.addBtn, isSaved && styles.addBtnSaved]}
          onPress={() => onToggleSave(deal.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isSaved ? 'checkmark' : 'add'}
            size={18}
            color={isSaved ? '#fff' : '#0B132B'}
          />
        </TouchableOpacity>
      </View>

      {/* DETAILS */}
      <View style={styles.cardDetails}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {deal.title}
        </Text>

        <View style={styles.priceRow}>
          {deal.original_price ? (
            <Text style={styles.oldPrice}>
              {deal.original_price.toFixed(2).replace('.', ',')} €
            </Text>
          ) : null}
          <Text style={styles.dealPrice}>
            {(deal.price ?? 0).toFixed(2).replace('.', ',')} €
          </Text>
        </View>

        {deal.price_per_unit_label ? (
          <Text style={styles.unitPriceText} numberOfLines={1}>
            {deal.price_per_unit_label}
          </Text>
        ) : null}

        {validityLabel ? (
          <Text style={[styles.validityText, isNextWeek && styles.validityTextNext]}>
            {validityLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ─── Inline Categories ────────────────────────────────────────────────────────
const CategoryTree = React.memo(({
  currentCat,
  currentSub,
  onSelectCat,
  onSelectSub,
}: {
  currentCat: Category;
  currentSub: string;
  onSelectCat: (c: Category) => void;
  onSelectSub: (sub: string) => void;
}) => {
  const subCats = currentCat && currentCat !== 'Alle' ? SUB_CATEGORIES[currentCat] || [] : [];
  
  return (
    <View style={styles.categoryTreeWrapper}>
      {/* Main Categories Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTreeContent}
      >
        {CATEGORIES.map((cat) => {
          const active = currentCat === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={[styles.treePill, active && styles.treePillActive]}
              onPress={() => onSelectCat(cat.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.treePillIcon}>{cat.icon}</Text>
              <Text style={[styles.treePillText, active && styles.treePillTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Subcategories Row */}
      {subCats.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryTreeContent, styles.subCategoryRow]}
        >
          {subCats.map((sub) => {
            const active = currentSub === sub;
            return (
              <TouchableOpacity
                key={sub}
                style={[styles.treeSubPill, active && styles.treeSubPillActive]}
                onPress={() => onSelectSub(active ? '' : sub)}
                activeOpacity={0.8}
              >
                <Text style={[styles.treeSubPillText, active && styles.treeSubPillTextActive]}>
                  {sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
});

// ─── Filter Bar ────────────────────────────────────────────────────────────
const FilterBar = React.memo(({
  timing,
  category,
  hideNonFood,
  hideJunkFood,
  minDiscount,
  onTimingChange,
  onCategoryPress,
  onNonFoodToggle,
  onJunkFoodToggle,
  onDiscountToggle,
}: {
  timing: TimingFilter;
  category: Category;
  hideNonFood: boolean;
  hideJunkFood: boolean;
  minDiscount: number;
  onTimingChange: (t: TimingFilter) => void;
  onCategoryPress: () => void;
  onNonFoodToggle: () => void;
  onJunkFoodToggle: () => void;
  onDiscountToggle: () => void;
}) => (
  <View style={styles.filterBarWrapper}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBarContent}
    >
      {/* Timing pills */}
      {TIMING_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.filterPill, timing === opt.value && styles.filterPillActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onTimingChange(opt.value); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterPillText, timing === opt.value && styles.filterPillTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={styles.filterDivider} />

      {/* Min Discount toggle */}
      <TouchableOpacity
        style={[styles.filterPill, minDiscount > 0 && styles.filterPillActive]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDiscountToggle(); }}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterPillText, minDiscount > 0 && styles.filterPillTextActive]}>
          {minDiscount > 0 ? `≥ ${minDiscount}% Rabatt` : '% Rabatt'}
        </Text>
      </TouchableOpacity>

      {/* Non-Food toggle */}
      <TouchableOpacity
        style={[styles.filterPill, !hideNonFood && styles.filterPillActive]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNonFoodToggle(); }}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterPillText, !hideNonFood && styles.filterPillTextActive]}>
          {hideNonFood ? 'Non-Food aus' : 'Non-Food an'}
        </Text>
      </TouchableOpacity>

      {/* Junk Food toggle */}
      <TouchableOpacity
        style={[styles.filterPill, !hideJunkFood && styles.filterPillActive]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onJunkFoodToggle(); }}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterPillText, !hideJunkFood && styles.filterPillTextActive]}>
          {hideJunkFood ? 'Süßes aus' : 'Süßes an'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
));

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────
export default function MainHomeScreen() {
  const {
    deals,
    isLoadingDeals,
    isLoadingMore,
    hasMore,
    fetchDeals,
    loadMoreDeals,
    shoppingList,
    addToList,
    removeFromList,
    filters,
    setFilter,
    totalCount,
    favoriteStores,
  } = useSparGatorStore();

  const [discountCycle, setDiscountCycle] = useState(0);
  const DISCOUNT_STEPS = [0, 20, 40];

  const sortedStores = useMemo(() => {
    return [...STORES].sort((a, b) => {
      const aFav = favoriteStores.includes(a.id) ? 1 : 0;
      const bFav = favoriteStores.includes(b.id) ? 1 : 0;
      return bFav - aFav; // favorites first
    });
  }, [favoriteStores]);

  useEffect(() => {
    fetchDeals();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchDeals();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ✅ useMemo: savedIds Set wird nur neu aufgebaut wenn shoppingList sich ändert
  const savedIds = useMemo(
    () => new Set(shoppingList.map((e) => e.deal.id)),
    [shoppingList]
  );

  const handleToggleSave = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const entry = shoppingList.find((e) => e.deal.id === id);
    if (entry) {
      removeFromList(entry.id);
    } else {
      const deal = deals.find((d) => d.id === id);
      if (deal) addToList(deal);
    }
  }, [shoppingList, deals, addToList, removeFromList]);

  const handleToggleStore = useCallback((storeId: StoreSlug) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = filters.activeStores;
    const ALL_STORES = STORES.map(s => s.id);
    
    let next: StoreSlug[];
    if (prev.length === ALL_STORES.length) {
      // Wenn aktuell alle ausgewählt sind und man einen antippt -> nur diesen einen auswählen
      next = [storeId];
    } else if (prev.length === 1 && prev.includes(storeId)) {
      // Wenn nur dieser eine ausgewählt ist und man ihn abwählt -> wieder alle auswählen
      next = ALL_STORES;
    } else {
      // Ansonsten normal toggeln (hinzufügen/entfernen)
      next = prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId];
      
      // Falls man den letzten entfernt hat, zur Sicherheit wieder alle anzeigen
      if (next.length === 0) {
        next = ALL_STORES;
      }
    }
    setFilter('activeStores', next);
  }, [filters.activeStores, setFilter]);

  const handleDiscountToggle = useCallback(() => {
    const next = (discountCycle + 1) % DISCOUNT_STEPS.length;
    setDiscountCycle(next);
    setFilter('minDiscountPct', DISCOUNT_STEPS[next]);
  }, [discountCycle, setFilter]);

  const handleNonFoodToggle = useCallback(() => {
    setFilter('hideNonFood', !filters.hideNonFood);
  }, [filters.hideNonFood, setFilter]);

  const handleJunkFoodToggle = useCallback(() => {
    setFilter('hideJunkFood', !filters.hideJunkFood);
  }, [filters.hideJunkFood, setFilter]);

  // ✅ renderItem ist stabil dank useCallback + savedIds aus useMemo
  const listData = useMemo(() => {
    const rows = [];
    let currentCategory = null;
    let currentRow: Deal[] = [];

    deals.forEach((deal) => {
      if (deal.category !== currentCategory) {
        if (currentRow.length > 0) {
          rows.push({ type: 'row', id: `row-${currentRow[0].id}`, items: currentRow });
          currentRow = [];
        }
        currentCategory = deal.category;
        rows.push({ type: 'header', id: `header-${currentCategory}-${deal.id}`, title: currentCategory });
      }

      currentRow.push(deal);

      if (currentRow.length === 2) {
        rows.push({ type: 'row', id: `row-${currentRow[0].id}`, items: currentRow });
        currentRow = [];
      }
    });

    if (currentRow.length > 0) {
      rows.push({ type: 'row', id: `row-${currentRow[0].id}`, items: currentRow });
    }

    return rows;
  }, [deals]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>{item.title}</Text>
        </View>
      );
    }
    return (
      <View style={styles.listRow}>
        {item.items.map((deal: Deal) => (
          <View key={deal.id} style={styles.listRowItem}>
            <DealCard
              deal={deal}
              isSaved={savedIds.has(deal.id)}
              onToggleSave={handleToggleSave}
            />
          </View>
        ))}
        {item.items.length === 1 && <View style={styles.listRowItem} />}
      </View>
    );
  }, [savedIds, handleToggleSave]);

  // ✅ renderFooter in useCallback
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }, [isLoadingMore]);

  // ✅ getItemLayout: keine Layout-Messungen nötig, da feste Karten-Höhe


  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) loadMoreDeals();
  }, [hasMore, isLoadingMore, loadMoreDeals]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* HEADER mit Branding */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.screenTitle}>Angebote</Text>
          {totalCount > 0 && !isLoadingDeals && (
            <Text style={styles.screenSubtitle}>{totalCount} Angebote</Text>
          )}
        </View>

        {/* Branding: Logo + App-Name */}
        <View style={styles.brandingContainer}>
          <View style={styles.brandingTextCol}>
            <Text style={styles.brandingName}>aggreGATOR</Text>
            <Text style={styles.brandingTagline}>Spare mehr. Schneller.</Text>
          </View>
          <Image
            source={require('@/assets/logo.jpg')}
            style={styles.brandingLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 48 }}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 16, color: '#111827' }}
            placeholder="Produkt, Marke oder Kategorie suchen..."
            placeholderTextColor="#9CA3AF"
            value={filters.searchQuery}
            onChangeText={(text) => setFilter('searchQuery', text)}
            returnKeyType="search"
          />
          {filters.searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setFilter('searchQuery', '')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* STORE SELECTOR */}
      <View style={styles.storeSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storeScrollTrack}
        >
          {sortedStores.map((store) => {
            const isActive = filters.activeStores.includes(store.id);
            const isFav = favoriteStores.includes(store.id);
            return (
              <TouchableOpacity
                key={store.id}
                onPress={() => handleToggleStore(store.id)}
                style={[styles.storePill, isActive && { backgroundColor: store.color, borderColor: store.color }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.storePillText, isActive && styles.storePillTextActive]}>
                  {store.name} {isFav && '❤️'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* CATEGORY TREE */}
      <CategoryTree
        currentCat={filters.activeCategory}
        currentSub={filters.searchQuery}
        onSelectCat={(c) => {
          setFilter('activeCategory', c);
          setFilter('searchQuery', ''); // Reset subcat on main cat change
        }}
        onSelectSub={(sub) => setFilter('searchQuery', sub)}
      />

      {/* FILTER BAR */}
      <FilterBar
        timing={filters.activeTiming}
        category={filters.activeCategory}
        hideNonFood={filters.hideNonFood}
        hideJunkFood={filters.hideJunkFood}
        minDiscount={filters.minDiscountPct}
        onTimingChange={(t) => setFilter('activeTiming', t)}
        onCategoryPress={() => {}}
        onNonFoodToggle={handleNonFoodToggle}
        onJunkFoodToggle={handleJunkFoodToggle}
        onDiscountToggle={handleDiscountToggle}
      />

      {/* DEAL GRID */}
      {isLoadingDeals ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Angebote werden geladen…</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchDeals}
          refreshing={isLoadingDeals}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          renderItem={renderItem}
          windowSize={11}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                Keine Angebote für diese Auswahl gefunden.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => useSparGatorStore.getState().resetFilters()}
              >
                <Text style={styles.resetBtnText}>Filter zurücksetzen</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerLeft: { flex: 1 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  screenSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },

  // Branding
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandingTextCol: {
    alignItems: 'flex-end',
  },
  brandingName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandingTagline: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },
  brandingLogo: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },

  // Store selector
  storeSelectorContainer: { borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingVertical: 8 },
  storeScrollTrack: { paddingHorizontal: 16, gap: 8 },
  storePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  storePillText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  storePillTextActive: { color: '#FFFFFF', fontWeight: '800' },

  // Filter bar
  filterBarWrapper: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  filterBarContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  filterPillText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  filterPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  filterDivider: { width: 1, height: 20, backgroundColor: '#334155', alignSelf: 'center' },

  // Grid & List
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  listHeader: { marginTop: 16, marginBottom: 12, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  listHeaderText: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  listRowItem: { flex: 1, maxWidth: '48%' },

  // Card
  card: { width: CARD_WIDTH, backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  imageContainer: { width: '100%', height: CARD_IMAGE_H, backgroundColor: '#FFFFFF', position: 'relative', justifyContent: 'center', alignItems: 'center', padding: 6 },
  image: { width: '100%', height: '100%' },
  storeBadge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  storeBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  nextWeekBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: '#7C3AED', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  nextWeekBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  discountBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  appBadge: { position: 'absolute', top: 24, left: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284C7', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, gap: 2 },
  appBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  addBtn: { position: 'absolute', bottom: 6, right: 6, backgroundColor: '#F1F5F9', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2 },
  addBtnSaved: { backgroundColor: '#16A34A' },

  // Card details
  cardDetails: { padding: 10, gap: 3 },
  productTitle: { fontSize: 13, fontWeight: '700', color: '#F8FAFC', lineHeight: 17, minHeight: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  oldPrice: { fontSize: 12, color: '#64748B', textDecorationLine: 'line-through' },
  dealPrice: { fontSize: 17, fontWeight: '900', color: '#F8FAFC' },
  unitPriceText: { fontSize: 10, color: '#94A3B8' },
  validityText: { fontSize: 10, color: '#64748B', marginTop: 1 },
  validityTextNext: { color: '#A78BFA' },

  // Footer loader
  footerLoader: { paddingVertical: 20, alignItems: 'center' },

  // Empty / loading
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: '#64748B', fontSize: 13, marginTop: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  resetBtn: { marginTop: 8, backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  resetBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Category Tree
  categoryTreeWrapper: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  categoryTreeContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  subCategoryRow: { marginTop: 8 },
  treePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  treePillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  treePillIcon: { fontSize: 14 },
  treePillText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  treePillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  treeSubPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#0B132B', borderWidth: 1, borderColor: '#334155' },
  treeSubPillActive: { backgroundColor: '#1E293B', borderColor: '#A78BFA' },
  treeSubPillText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  treeSubPillTextActive: { color: '#A78BFA', fontWeight: '700' },
});
