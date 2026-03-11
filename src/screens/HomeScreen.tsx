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
import { Colors, StatusColors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { RootStackParamList } from '../navigation';
import { formatDaysLeft, getDaysUntilExpiry } from '../utils/helpers';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { items, loadAll, getCategorySummaries, getExpiringItems, getOverallScore, settings } = useStore();

  useEffect(() => {
    loadAll();
  }, []);

  const summaries = getCategorySummaries();
  const expiringItems = getExpiringItems(30);
  const criticalItems = getExpiringItems(14);
  const score = getOverallScore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>防災備蓄マネージャー</Text>
            <Text style={styles.headerSub}>{settings.memberCount}人家族の備蓄状況</Text>
          </View>
          <Text style={styles.headerEmoji}>🛡️</Text>
        </View>

        {/* 緊急アラート */}
        {criticalItems.length > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => navigation.navigate('Main' as any)}
          >
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>期限切れ間近 {criticalItems.length}件</Text>
              <Text style={styles.alertDesc} numberOfLines={1}>
                {criticalItems[0].name}　{formatDaysLeft(getDaysUntilExpiry(criticalItems[0].expiryDate))}
              </Text>
            </View>
            <Text style={styles.alertArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* 備蓄スコア */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>備蓄スコア</Text>
          <View style={styles.scoreRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${score}%` as any }]} />
            </View>
            <Text style={styles.scoreText}>{score}%</Text>
          </View>
          <Text style={styles.scoreDesc}>推奨量の{score}%を達成中</Text>
        </View>

        {/* カテゴリ別ステータス */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>カテゴリ別ステータス</Text>
          {summaries.map((s) => (
            <View key={s.category} style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>{s.icon}</Text>
              <Text style={styles.categoryName}>{s.category}</Text>
              <View style={{ flex: 1 }} />
              <View style={[styles.statusBadge, { backgroundColor: StatusColors[s.status] + '22' }]}>
                <View style={[styles.statusDot, { backgroundColor: StatusColors[s.status] }]} />
                <Text style={[styles.statusText, { color: StatusColors[s.status] }]}>{s.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 期限間近リスト */}
        {expiringItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>期限間近の備蓄品</Text>
            {expiringItems.slice(0, 3).map((item) => {
              const days = getDaysUntilExpiry(item.expiryDate);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.expiryRow}
                  onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expiryName}>{item.name}</Text>
                    <Text style={[styles.expiryDays, days <= 7 && { color: Colors.danger }]}>
                      {formatDaysLeft(days)}
                    </Text>
                  </View>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 追加ボタン */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddItem', {})}
        >
          <Text style={styles.addBtnText}>＋ 備蓄品を追加</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.subText, marginTop: 2 },
  headerEmoji: { fontSize: 32 },
  alertBanner: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  alertIcon: { fontSize: 20, marginRight: 10 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: Colors.danger },
  alertDesc: { fontSize: 13, color: Colors.text, marginTop: 2 },
  alertArrow: { fontSize: 20, color: Colors.danger },
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
  cardLabel: { fontSize: 14, fontWeight: '600', color: Colors.subText, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  progressTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  scoreText: { fontSize: 20, fontWeight: '700', color: Colors.primary, minWidth: 44 },
  scoreDesc: { fontSize: 12, color: Colors.subText },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryIcon: { fontSize: 20, marginRight: 10 },
  categoryName: { fontSize: 15, color: Colors.text },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expiryName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  expiryDays: { fontSize: 13, color: Colors.warning, marginTop: 2 },
  arrowText: { fontSize: 20, color: Colors.subText },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
