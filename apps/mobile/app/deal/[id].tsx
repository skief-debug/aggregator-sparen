import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSparGatorStore } from '@/lib/store';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80';

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToList, shoppingList, deals } = useSparGatorStore();
  const [imageError, setImageError] = useState(false);

  const deal = deals.find((d) => d.id === id);
  const isInList = shoppingList.some((e) => e.deal.id === id);

  if (!deal) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Deal nicht gefunden.</Text>
      </View>
    );
  }

  const savedAmount = deal.original_price
    ? (deal.original_price - deal.price).toFixed(2).replace('.', ',')
    : null;
    
  const validUrl = deal.image_url && deal.image_url.startsWith('http') ? deal.image_url : FALLBACK_IMAGE;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Product Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageError ? FALLBACK_IMAGE : validUrl }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
          {/* Badges Overlay */}
          <View style={styles.imageBadges}>
            <View style={[styles.storeBadge, { backgroundColor: deal.store?.primary_color || '#111' }]}>
              <Text style={[styles.storeBadgeText, { color: deal.store?.text_color || '#fff' }]}>
                {deal.store?.name}
              </Text>
            </View>
            {(deal.discount_pct ?? 0) > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>-{deal.discount_pct}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{deal.title}</Text>
          {deal.subtitle && <Text style={styles.subtitle}>{deal.subtitle}</Text>}

          {/* Price Block */}
          <View style={styles.priceBlock}>
            <Text style={styles.price}>
              {deal.price?.toFixed(2).replace('.', ',')} €
            </Text>
            <View style={styles.priceDetails}>
              {deal.original_price && (
                <Text style={styles.originalPrice}>
                  UVP: {deal.original_price.toFixed(2).replace('.', ',')} €
                </Text>
              )}
              {deal.price_per_unit_label && (
                <Text style={styles.grundpreis}>{deal.price_per_unit_label}</Text>
              )}
            </View>
            {savedAmount && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Du sparst {savedAmount} €</Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {deal.tags && deal.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {deal.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Details List */}
          <View style={styles.detailsCard}>
            <DetailRow label="Gültig von" value={formatDate(deal.valid_from)} />
            <DetailRow label="Gültig bis" value={formatDate(deal.valid_to)} />
            {deal.timing_tag === 'SATURDAY_ONLY' && (
              <DetailRow label="⚡ Achtung" value="Nur am Samstag!" highlight />
            )}
            {deal.category && (
              <DetailRow label="Kategorie" value={deal.category} />
            )}
            {deal.brand && <DetailRow label="Marke" value={deal.brand} />}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar for Adding to List */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.addButton, isInList && styles.addButtonActive]}
          onPress={() => {
            if (!isInList) addToList(deal);
            router.back();
          }}
          activeOpacity={0.9}
        >
          <Ionicons name={isInList ? 'checkmark' : 'add'} size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>
            {isInList ? 'In der Einkaufsliste' : 'Zur Einkaufsliste'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean; }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && { color: '#E11D48' }]}>
        {value}
      </Text>
    </View>
  );
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  error: { color: '#111827', textAlign: 'center', marginTop: 40 },
  scroll: { paddingBottom: 120 },

  imageContainer: {
    backgroundColor: '#fff',
    position: 'relative',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: 320,
    backgroundColor: '#fff',
  },
  imageBadges: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  storeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  storeBadgeText: { fontSize: 13, fontWeight: '800' },
  discountBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  discountBadgeText: { color: '#000', fontSize: 13, fontWeight: '900' },

  infoContainer: { padding: 20 },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: { color: '#6B7280', fontSize: 16, marginBottom: 24 },

  priceBlock: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  price: { color: '#E11D48', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  priceDetails: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 4, marginBottom: 12 },
  originalPrice: {
    color: '#9CA3AF',
    fontSize: 15,
    textDecorationLine: 'line-through',
    fontWeight: '500'
  },
  grundpreis: { color: '#6B7280', fontSize: 15 },
  savingsBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  savingsText: { color: '#E11D48', fontWeight: '800', fontSize: 13 },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tagText: { color: '#2563EB', fontSize: 13, fontWeight: '700' },

  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: { color: '#6B7280', fontSize: 15 },
  detailValue: { color: '#111827', fontWeight: '700', fontSize: 15 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 10,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addButtonActive: { backgroundColor: '#10B981', shadowColor: '#10B981' },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
