import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSparGatorStore } from '@/lib/store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_SPACING * 3) / 2;

const MARKTGURU_API_KEY = "8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=";
const MARKTGURU_CLIENT_KEY = "FtBfWwvvo8TcBpzGO5lHmTGi68ayFC/DTT4YPQuXcTA=";

export interface ApiBrochurePage {
  id: string | number;
  pageNumber: number;
  imageUrl: string;
}

export interface ApiBrochure {
  id: string | number;
  storeName: string;
  title: string;
  validFrom: string;
  validTo: string;
  coverImageUrl: string;
  badge?: string;
  badgeColor?: string;
  pages: ApiBrochurePage[];
}

export default function BrochuresScreen() {
  const [brochures, setBrochures] = useState<ApiBrochure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  const { favoriteStores, toggleFavoriteStore } = useSparGatorStore();
  
  const [activeBrochure, setActiveBrochure] = useState<ApiBrochure | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const viewerListRef = useRef<FlatList>(null);

  const fetchBrochures = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const url = `https://api.marktguru.de/api/v1/leafletflights?limit=200&zipCode=19053`;
      const response = await fetch(url, {
        headers: {
          "x-apikey": MARKTGURU_API_KEY,
          "x-clientkey": MARKTGURU_CLIENT_KEY,
          "origin": "https://www.marktguru.de",
          "user-agent": "Mozilla/5.0"
        }
      });
      
      if (!response.ok) throw new Error("Netzwerkfehler");
      const data = await response.json();
      
      const now = new Date();

      const mapped = (data.results || []).map((flight: any) => {
        const fromDate = new Date(flight.validFrom);
        const toDate = new Date(flight.validTo);
        const fromStr = `${fromDate.getDate().toString().padStart(2, '0')}.${(fromDate.getMonth() + 1).toString().padStart(2, '0')}.`;
        const toStr = `${toDate.getDate().toString().padStart(2, '0')}.${(toDate.getMonth() + 1).toString().padStart(2, '0')}.`;
        
        let badge = undefined;
        let badgeColor = undefined;
        
        if (now >= fromDate && now <= toDate) {
          badge = "AKTUELL";
          badgeColor = "#10B981"; // Green
        } else if (now < fromDate) {
          badge = "DEMNÄCHST";
          badgeColor = "#F59E0B"; // Orange
        }
        
        // Generate pages array dynamically
        const pages: ApiBrochurePage[] = [];
        const pageCount = flight.pageCount || 10;
        for (let i = 0; i < pageCount; i++) {
          pages.push({
            id: `${flight.id}-page-${i}`,
            pageNumber: i,
            // Fixed image URL using /images/pages/ prefix which Marktguru expects
            imageUrl: `https://cdn.marktguru.de/api/v1/leaflets/${flight.mainLeafletId}/images/pages/${i}/large.webp`
          });
        }
        
        return {
          id: flight.id,
          storeName: flight.advertiser?.name || "Unbekannt",
          title: "Aktueller Prospekt",
          validFrom: fromStr,
          validTo: toStr,
          coverImageUrl: `https://cdn.marktguru.de/api/v1/leaflets/${flight.mainLeafletId}/images/pages/${flight.mainLeafletPageIndex}/medium.webp`,
          badge,
          badgeColor,
          pages
        };
      });
      
      setBrochures(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrochures();
  }, []);

  const handleRefresh = () => {
    fetchBrochures(true);
  };

  const handleOpenBrochure = (brochure: ApiBrochure) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveBrochure(brochure);
    setCurrentPageIndex(0);
  };

  const handleCloseBrochure = () => {
    setActiveBrochure(null);
    setCurrentPageIndex(0);
  };

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page >= 0) {
      setCurrentPageIndex(page);
    }
  }, []);

  const filteredBrochures = brochures.filter((b) => {
    if (showOnlyFavorites && !favoriteStores.includes(b.storeName)) return false;
    if (searchQuery.trim().length > 0) {
      if (!b.storeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const renderBrochureCard = ({ item }: { item: ApiBrochure }) => {
    const isFav = favoriteStores.includes(item.storeName);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => handleOpenBrochure(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Ionicons name="notifications-outline" size={16} color="#94A3B8" />
            <Text style={styles.storeTitle} numberOfLines={1}>
              {item.storeName.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavoriteStore(item.storeName);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? "#EF4444" : "#94A3B8"} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.coverImageUrl }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          {item.badge && (
            <View style={[styles.badgeContainer, { backgroundColor: item.badgeColor }]}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.brochureName} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.validityDate}>
            {item.validFrom} – {item.validTo}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Screen Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prospekte</Text>
        <Text style={styles.headerSubtitle}>Aktuelle Angebote deiner Märkte</Text>

        {/* Search Bar & Global Favorite Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Suche Markt (z.B. Lidl)"
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.favToggleBtn, showOnlyFavorites && styles.favToggleBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowOnlyFavorites(!showOnlyFavorites);
            }}
          >
            <Ionicons name={showOnlyFavorites ? "heart" : "heart-outline"} size={24} color={showOnlyFavorites ? "#EF4444" : "#94A3B8"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2-Spaltiges Grid */}
      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredBrochures}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderBrochureCard}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridColumnWrapper}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {searchQuery || showOnlyFavorites ? "Keine Ergebnisse für deine Suche." : "Keine Prospekte in der Umgebung gefunden."}
              </Text>
            </View>
          }
        />
      )}

      {/* In-App Swipe Viewer (Vollbild-Modal) */}
      <Modal
        visible={!!activeBrochure}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCloseBrochure}
      >
        {activeBrochure && (
          <SafeAreaView style={styles.viewerContainer} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Viewer Header */}
            <View style={styles.viewerHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleCloseBrochure}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.viewerTitleContainer}>
                <Text style={styles.viewerStoreTitle} numberOfLines={1}>
                  {activeBrochure.storeName}
                </Text>
                <Text style={styles.viewerSubTitle} numberOfLines={1}>
                  {activeBrochure.title}
                </Text>
              </View>
              <View style={{ width: 32 }} />
            </View>

            {/* Horizontaler Seiten-Swipe-Stream */}
            <FlatList
              ref={viewerListRef}
              data={activeBrochure.pages}
              keyExtractor={(page) => String(page.id || page.pageNumber)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              windowSize={5}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={styles.pageContainer}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.pageImage}
                    contentFit="contain"
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                </View>
              )}
            />

            {/* Viewer Footer (Seitenindikator) */}
            <View style={styles.viewerFooter}>
              <View style={styles.pageCounterPill}>
                <Text style={styles.pageCounterText}>
                  Seite {currentPageIndex + 1} von {activeBrochure.pages.length}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2541',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#2A3656',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 15,
  },
  favToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1C2541',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3656',
  },
  favToggleBtnActive: {
    backgroundColor: '#EF444420',
    borderColor: '#EF444450',
  },
  gridContent: {
    padding: GRID_SPACING,
    paddingBottom: 32,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: GRID_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1C2541',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A3656',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  storeTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  imageWrapper: {
    width: '100%',
    height: CARD_WIDTH * 1.38,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardFooter: {
    padding: 10,
    gap: 2,
  },
  brochureName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  validityDate: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(11, 19, 43, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    zIndex: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  viewerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerStoreTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  viewerSubTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  viewerFooter: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pageCounterPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
