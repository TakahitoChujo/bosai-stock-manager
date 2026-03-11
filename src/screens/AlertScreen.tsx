import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { RootStackParamList } from '../navigation';
import { getDaysUntilExpiry, formatDaysLeft, formatDate } from '../utils/helpers';
import { StockItem } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function AlertScreen() {
  const navigation = useNavigation<NavProp>();
  const { items, settings, saveSettings, loadAll } = useStore();

  useEffect(() => {
    loadAll();
  }, []);

  const expiredItems = items.filter((i) => getDaysUntilExpiry(i.expiryDate) < 0);
  const soonItems = items.filter((i) => {
    const d = getDaysUntilExpiry(i.expiryDate);
    return d >= 0 && d <= 30;
  });
  const lowStockItems = items.filter((i) => {
    const ratio = i.recommendedQuantity > 0 ? i.quantity / i.recommendedQuantity : 1;
    return ratio < 0.5 && i.quantity < i.recommendedQuantity;
  });
  const okItems = items.filter((i) => {
    const d = getDaysUntilExpiry(i.expiryDate);
    const ratio = i.recommendedQuantity > 0 ? i.quantity / i.recommendedQuantity : 1;
    return d > 30 && ratio >= 0.8;
  });

  const NOTIFY_OPTIONS = [90, 30, 7, 1];

  function toggleNotifyDay(day: number) {
    const current = settings.notifyDays;
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => b - a);
    saveSettings({ ...settings, notifyDays: updated });
  }

  function AlertItem({ item, urgent }: { item: StockItem; urgent?: boolean }) {
    const days = getDaysUntilExpiry(item.expiryDate);
    return (
      <TouchableOpacity
        style={styles.alertItem}
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.alertItemName}>{item.name}</Text>
          <Text style={[styles.alertItemDays, urgent && { color: Colors.danger }]}>
            {days < 0 ? '⚠️ 期限切れ' : `📅 ${formatDaysLeft(days)}`}
            {item.expiryDate !== '2099-12-31' && `　${formatDate(item.expiryDate)}`}
          </Text>
        </View>
        <Text style={styles.arrowText}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>通知・アラート</Text>

        {/* 期限切れ */}
        {expiredItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: Colors.dangerLight }]}>
              <Text style={[styles.sectionTitle, { color: Colors.danger }]}>
                🔴 期限切れ ({expiredItems.length}件)
              </Text>
            </View>
            {expiredItems.map((item) => (
              <AlertItem key={item.id} item={item} urgent />
            ))}
          </View>
        )}

        {/* 期限間近 */}
        {soonItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: Colors.warningLight }]}>
              <Text style={[styles.sectionTitle, { color: Colors.warning }]}>
                🟡 期限間近 ({soonItems.length}件)
              </Text>
            </View>
            {soonItems.map((item) => (
              <AlertItem key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* 在庫不足 */}
        {lowStockItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: Colors.dangerLight }]}>
              <Text style={[styles.sectionTitle, { color: Colors.danger }]}>
                📦 在庫不足 ({lowStockItems.length}件)
              </Text>
            </View>
            {lowStockItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.alertItem}
                onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertItemName}>{item.name}</Text>
                  <Text style={[styles.alertItemDays, { color: Colors.danger }]}>
                    {item.quantity}{item.unit}（推奨 {item.recommendedQuantity}{item.unit}）
                  </Text>
                </View>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 問題なし */}
        {okItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: Colors.safeLight }]}>
              <Text style={[styles.sectionTitle, { color: Colors.safe }]}>
                ✅ 問題なし ({okItems.length}件)
              </Text>
            </View>
            <View style={styles.okList}>
              {okItems.slice(0, 5).map((item) => (
                <Text key={item.id} style={styles.okItem}>✅ {item.name}</Text>
              ))}
              {okItems.length > 5 && (
                <Text style={styles.okMore}>他 {okItems.length - 5}件</Text>
              )}
            </View>
          </View>
        )}

        {/* 通知設定 */}
        <View style={[styles.section, { borderWidth: 1, borderColor: Colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔔 通知タイミング設定</Text>
          </View>
          <View style={styles.notifyOptions}>
            {NOTIFY_OPTIONS.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.notifyBtn,
                  settings.notifyDays.includes(day) && styles.notifyBtnActive,
                ]}
                onPress={() => toggleNotifyDay(day)}
              >
                <Text style={[
                  styles.notifyBtnText,
                  settings.notifyDays.includes(day) && styles.notifyBtnTextActive,
                ]}>
                  {day === 1 ? '当日' : `${day}日前`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {expiredItems.length === 0 && soonItems.length === 0 && lowStockItems.length === 0 && (
          <View style={styles.allGood}>
            <Text style={styles.allGoodEmoji}>🎉</Text>
            <Text style={styles.allGoodText}>すべての備蓄品が良好な状態です！</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    padding: 12,
    paddingHorizontal: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  alertItemName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  alertItemDays: { fontSize: 13, color: Colors.warning, marginTop: 2 },
  arrowText: { fontSize: 20, color: Colors.subText },
  okList: { padding: 14 },
  okItem: { fontSize: 14, color: Colors.text, marginBottom: 6 },
  okMore: { fontSize: 13, color: Colors.subText },
  notifyOptions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    flexWrap: 'wrap',
  },
  notifyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifyBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  notifyBtnText: { fontSize: 14, color: Colors.subText },
  notifyBtnTextActive: { color: '#fff', fontWeight: '600' },
  allGood: { alignItems: 'center', paddingVertical: 40 },
  allGoodEmoji: { fontSize: 48, marginBottom: 12 },
  allGoodText: { fontSize: 16, color: Colors.text, fontWeight: '500' },
});
