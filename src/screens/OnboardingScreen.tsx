import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { RECOMMENDED_CHECKLIST, calcRecommended } from '../constants/checklist';

export default function OnboardingScreen() {
  const [memberCount, setMemberCount] = useState(2);
  const [hasPet, setHasPet] = useState(false);
  const { saveSettings, addItem } = useStore();

  function handleStart() {
    saveSettings({
      memberCount,
      hasPet,
      isOnboarded: true,
      notifyDays: [90, 30, 7],
    });

    // チェックリストをデフォルト在庫として登録（数量0で）
    // ペット品目は hasPet が true の時のみ追加
    const farFuture = '2099-12-31';
    RECOMMENDED_CHECKLIST
      .filter((item) => !item.isPetItem || hasPet)
      .forEach((item) => {
        addItem({
          name: item.name,
          category: item.category,
          quantity: 0,
          unit: item.unit,
          expiryDate: farFuture,
          recommendedQuantity: calcRecommended(item, memberCount),
        });
      });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🛡️</Text>
          <Text style={styles.title}>防災備蓄マネージャー</Text>
          <Text style={styles.subtitle}>家族の安心を、ずっと管理する。</Text>
        </View>

        {/* 家族人数 */}
        <View style={styles.card}>
          <Text style={styles.label}>ご家族は何人ですか？</Text>

          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setMemberCount((v) => Math.max(1, v - 1))}
            >
              <Text style={styles.counterBtnText}>－</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{memberCount}人</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setMemberCount((v) => Math.min(10, v + 1))}
            >
              <Text style={styles.counterBtnText}>＋</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickSelect}>
            {[1, 2, 3, 4].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.quickBtn, memberCount === n && styles.quickBtnActive]}
                onPress={() => setMemberCount(n)}
              >
                <Text style={[styles.quickBtnText, memberCount === n && styles.quickBtnTextActive]}>
                  {n === 4 ? '4人以上' : `${n}人`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ペット */}
        <View style={styles.card}>
          <Text style={styles.label}>ペットはいますか？</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !hasPet && styles.toggleBtnActive]}
              onPress={() => setHasPet(false)}
            >
              <Text style={[styles.toggleBtnText, !hasPet && styles.toggleBtnTextActive]}>
                いない
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, hasPet && styles.toggleBtnActive]}
              onPress={() => setHasPet(true)}
            >
              <Text style={[styles.toggleBtnText, hasPet && styles.toggleBtnTextActive]}>
                🐾 いる
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 推奨数量プレビュー */}
        <View style={styles.card}>
          <Text style={styles.label}>推奨備蓄量（7日分）</Text>
          <Text style={styles.preview}>💧 水 約{calcRecommended(RECOMMENDED_CHECKLIST.find((i) => i.name === '飲料水（2Lペット）')!, memberCount)}本（2Lペット）</Text>
          <Text style={styles.preview}>🍱 食料 約{memberCount * 7}食分</Text>
          <Text style={styles.preview}>💊 薬・衛生用品 各種</Text>
          {hasPet && (
            <Text style={styles.preview}>🐾 ペット用品 フード7日分・水7本他</Text>
          )}
          <Text style={styles.previewNote}>* 政府推奨の7日分を基準に算出</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>チェックリストを生成する</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.subText,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 24,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 80,
    textAlign: 'center',
  },
  quickSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickBtnText: {
    fontSize: 13,
    color: Colors.subText,
  },
  quickBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: 15,
    color: Colors.subText,
  },
  toggleBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  preview: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 6,
  },
  previewNote: {
    fontSize: 12,
    color: Colors.subText,
    marginTop: 8,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
