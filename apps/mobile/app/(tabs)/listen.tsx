import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSparGatorStore } from '@/lib/store';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80';

export default function ListenScreen() {
  const { shoppingList, toggleChecked, updateQuantity, removeFromList, clearList } = useSparGatorStore();

  const handleClear = () => {
    if (shoppingList.length === 0) return;
    Alert.alert('Liste leeren', 'Bist du sicher, dass du alle Einträge löschen möchtest?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Leeren', style: 'destructive', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          clearList();
        } 
      }
    ]);
  };

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleChecked(id);
  };

  const handleChangeQty = (id: string, current: number, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (current + delta <= 0) {
      removeFromList(id);
    } else {
      updateQuantity(id, current + delta);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const validUrl = item.deal.image_url && item.deal.image_url.startsWith('http') ? item.deal.image_url : FALLBACK_IMAGE;

    return (
      <View style={[styles.listItem, item.checked && styles.listItemChecked]}>
        <TouchableOpacity style={styles.checkBtn} onPress={() => handleToggle(item.id)}>
          <Ionicons name={item.checked ? "checkmark-circle" : "ellipse-outline"} size={28} color={item.checked ? "#10B981" : "#D1D5DB"} />
        </TouchableOpacity>
        
        <Image source={{ uri: validUrl }} style={[styles.itemImage, item.checked && styles.dimmed]} resizeMode="contain" />
        
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, item.checked && styles.textStrikethrough]} numberOfLines={2}>
            {item.deal.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.itemPrice, item.checked && styles.dimmedText]}>
              {item.deal.price?.toFixed(2).replace('.', ',')} €
            </Text>
            {item.deal.store && (
              <Text style={styles.storeTag}>{item.deal.store.name}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.qtyControl}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => handleChangeQty(item.id, item.quantity, -1)}>
            <Ionicons name="remove" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => handleChangeQty(item.id, item.quantity, 1)}>
            <Ionicons name="add" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Einkaufsliste</Text>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={shoppingList}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Deine Liste ist leer</Text>
            <Text style={styles.emptyText}>Füge Angebote über das + Symbol auf der Entdecken-Seite hinzu.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
  },
  title: { fontSize: 24, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  clearButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  
  listContent: { padding: 16, paddingBottom: 40, gap: 12 },
  
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6'
  },
  listItemChecked: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', shadowOpacity: 0 },
  checkBtn: { marginRight: 12 },
  itemImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#fff', marginRight: 12 },
  dimmed: { opacity: 0.5 },
  
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice: { fontSize: 14, fontWeight: '900', color: '#E11D48' },
  dimmedText: { color: '#9CA3AF' },
  storeTag: { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },

  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, overflow: 'hidden', marginLeft: 12 },
  qtyBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  qtyText: { width: 24, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#111827' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 }
});
