import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FilterScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Filter & Sortierung</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Hier können bald globale Filter eingestellt werden.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  content: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 16, color: '#6B7280' }
});
