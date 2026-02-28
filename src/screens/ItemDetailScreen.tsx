import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, StatusColors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { CATEGORY_ICONS } from '../constants/checklist';
import { getDaysUntilExpiry, formatDate, formatDaysLeft, getStockStatus, buildAmazonSearchUrl, buildRakutenSearchUrl } from '../utils/helpers';
import { RootStackParamList } from '../navigation';

type DetailRoute = RouteProp<RootStackParamList, 'ItemDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ItemDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRoute>();
  const { items, consumeItem, deleteItem } = useStore();
  const [consumeAmount, setConsumeAmount] = useState(1);

  const item = items.find((i) => i.id === route.params.itemId);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.subText }}>
          データが見つかりません
        </Text>
      </SafeAreaView>
    );
  }

  const days = getDaysUntilExpiry(item.expiryDate);
  const status = getStockStatus(item.quantity, item.recommendedQuantity);
  const ratio = item.recommendedQuantity > 0
    ? Math.min(item.quantity / item.recommendedQuantity, 1)
    : 1;

  // 次の購入推奨日（期限の60日前）
  const purchaseDate = new Date(item.expiryDate);
  purchaseDate.setDate(purchaseDate.getDate() - 60);
  const isPurchaseNeeded = new Date() >= purchaseDate;

  function handleConsume() {
    Alert.alert(
      'ローリングストック',
      `${item!.name}を${consumeAmount}${item!.unit}消費しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '消費する',
          onPress: () => {
            consumeItem(item!.id, consumeAmount);
            Alert.alert('記録完了', '補充を忘れずに！🛒');
          },
        },
      ]
    );
  }

  function handleDelete() {
    Alert.alert(
      '削除確認',
      `${item!.name}を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteItem(item!.id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  const expiryColor = days < 0 ? Colors.danger : days <= 7 ? Colors.danger : days <= 30 ? Colors.warning : Colors.text;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* アイテムヘッダー */}
        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>{CATEGORY_ICONS[item.category]}</Text>
          <Text style={styles.headerName}>{item.name}</Text>
          <Text style={styles.headerCategory}>{item.category}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('AddItem', { editItemId: item.id })}
          >
            <Text style={styles.editBtnText}>✏️ 編集</Text>
          </TouchableOpacity>
        </View>

        {/* 在庫状況 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>現在の在庫</Text>
          <View style={styles.stockRow}>
            <Text style={styles.stockValue}>{item.quantity}</Text>
            <Text style={styles.stockUnit}>{item.unit}</Text>
            <Text style={styles.stockSep}>/</Text>
            <Text style={styles.stockRec}>推奨 {item.recommendedQuantity}{item.unit}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${ratio * 100}%` as any, backgroundColor: StatusColors[status] },
              ]}
            />
          </View>
          <Text style={[styles.statusText, { color: StatusColors[status] }]}>{status}</Text>
        </View>

        {/* 賞味期限 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>賞味期限</Text>
          <View style={styles.expiryRow}>
            <Text style={styles.expiryIcon}>📅</Text>
            <View>
              <Text style={[styles.expiryDays, { color: expiryColor }]}>
                {formatDaysLeft(days)}
              </Text>
              {item.expiryDate !== '2099-12-31' && (
                <Text style={styles.expiryDateText}>{formatDate(item.expiryDate)}</Text>
              )}
            </View>
          </View>

          {isPurchaseNeeded && (
            <View style={styles.purchaseAlert}>
              <Text style={styles.purchaseAlertText}>
                📦 補充推奨日を過ぎています。お早めに購入を！
              </Text>
            </View>
          )}
        </View>

        {/* ローリングストック */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ローリングストック（消費記録）</Text>
          <View style={styles.consumeRow}>
            <TouchableOpacity
              style={styles.consumeBtn}
              onPress={() => setConsumeAmount((v) => Math.max(1, v - 1))}
            >
              <Text style={styles.consumeBtnText}>－</Text>
            </TouchableOpacity>
            <Text style={styles.consumeAmount}>{consumeAmount}{item.unit}</Text>
            <TouchableOpacity
              style={styles.consumeBtn}
              onPress={() => setConsumeAmount((v) => v + 1)}
            >
              <Text style={styles.consumeBtnText}>＋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.consumeRecord} onPress={handleConsume}>
              <Text style={styles.consumeRecordText}>消費した</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 購入リンク（アフィリエイト） */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>🛒 補充・購入</Text>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => Linking.openURL(buildAmazonSearchUrl(item.name))}
          >
            <Text style={styles.buyBtnText}>🛒 Amazonで探す</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buyBtn, styles.rakutenBtn]}
            onPress={() => Linking.openURL(buildRakutenSearchUrl(item.name))}
          >
            <Text style={[styles.buyBtnText, styles.rakutenText]}>🛍️ 楽天市場で探す</Text>
          </TouchableOpacity>
        </View>

        {/* 削除 */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>この備蓄品を削除</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: { fontSize: 48, marginBottom: 8 },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerCategory: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  editBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontSize: 13, fontWeight: '600', color: Colors.subText, marginBottom: 12 },
  stockRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
  stockValue: { fontSize: 40, fontWeight: '700', color: Colors.text },
  stockUnit: { fontSize: 18, color: Colors.subText },
  stockSep: { fontSize: 18, color: Colors.disabled, marginHorizontal: 4 },
  stockRec: { fontSize: 14, color: Colors.subText },
  progressTrack: {
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 6 },
  statusText: { fontSize: 14, fontWeight: '700' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expiryIcon: { fontSize: 28 },
  expiryDays: { fontSize: 22, fontWeight: '700' },
  expiryDateText: { fontSize: 13, color: Colors.subText, marginTop: 2 },
  purchaseAlert: {
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  purchaseAlertText: { fontSize: 13, color: Colors.warning, fontWeight: '500' },
  consumeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consumeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumeBtnText: { fontSize: 20, color: Colors.primary, fontWeight: '700' },
  consumeAmount: { fontSize: 20, fontWeight: '700', color: Colors.text, minWidth: 60, textAlign: 'center' },
  consumeRecord: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  consumeRecordText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  buyBtn: {
    backgroundColor: '#FF9900',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rakutenBtn: { backgroundColor: '#BF0000' },
  rakutenText: { color: '#fff' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteBtnText: { color: Colors.danger, fontWeight: '600', fontSize: 14 },
});
