import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, StatusColors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { RootStackParamList } from '../navigation';
import { CATEGORIES, CATEGORY_ICONS } from '../constants/checklist';
import { getDaysUntilExpiry, formatDaysLeft, getStockStatus } from '../utils/helpers';
import { StockItem } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ItemListScreen() {
  const navigation = useNavigation<NavProp>();
  const { items, loadAll } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('全て');

  useEffect(() => {
    loadAll();
  }, []);

  const categories = ['全て', ...CATEGORIES];
  const filtered = selectedCategory === '全て'
    ? items
    : items.filter((i) => i.category === selectedCategory);

  function renderItem({ item }: { item: StockItem }) {
    const days = getDaysUntilExpiry(item.expiryDate);
    const status = getStockStatus(item.quantity, item.recommendedQuantity);
    const ratio = item.recommendedQuantity > 0
      ? Math.min(item.quantity / item.recommendedQuantity, 1)
      : 1;

    const isExpiringSoon = days >= 0 && days <= 30;
    const isExpired = days < 0;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemIcon}>{CATEGORY_ICONS[item.category]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>
              {item.quantity}{item.unit} / 推奨 {item.recommendedQuantity}{item.unit}
            </Text>
          </View>
          {(isExpiringSoon || isExpired) && (
            <View style={[styles.expiryBadge, isExpired ? styles.expiredBadge : styles.expiringSoonBadge]}>
              <Text style={styles.expiryBadgeText}>
                {isExpired ? '期限切れ' : formatDaysLeft(days)}
              </Text>
            </View>
          )}
        </View>

        {/* 在庫バー */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${ratio * 100}%` as any, backgroundColor: StatusColors[status] },
              ]}
            />
          </View>
          <View style={[styles.statusDot, { backgroundColor: StatusColors[status] }]} />
          <Text style={[styles.statusLabel, { color: StatusColors[status] }]}>{status}</Text>
        </View>

        {item.expiryDate !== '2099-12-31' && (
          <Text style={styles.expiryText}>
            期限: {item.expiryDate.replaceAll('-', '/')}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>備蓄品一覧</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddItem', {})}
        >
          <Text style={styles.addBtnText}>＋ 追加</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[styles.filterBtn, selectedCategory === cat && styles.filterBtnActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
                {cat !== '全て' && CATEGORY_ICONS[cat]} {cat}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Items */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>備蓄品が登録されていません</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddItem', {})}>
              <Text style={styles.emptyLink}>＋ 最初の備蓄品を追加する</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  filterWrap: { backgroundColor: Colors.surface, paddingVertical: 8 },
  filterList: { paddingHorizontal: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, color: Colors.subText },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  itemIcon: { fontSize: 24 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemQty: { fontSize: 13, color: Colors.subText, marginTop: 2 },
  expiryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  expiringSoonBadge: { backgroundColor: Colors.warningLight },
  expiredBadge: { backgroundColor: Colors.dangerLight },
  expiryBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.danger },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '600', minWidth: 28 },
  expiryText: { fontSize: 12, color: Colors.subText, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: Colors.subText, marginBottom: 16 },
  emptyLink: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
});
