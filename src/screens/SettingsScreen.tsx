import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';

export default function SettingsScreen() {
  const { settings, saveSettings, items } = useStore();
  const [memberCount, setMemberCount] = useState(settings.memberCount);
  const [hasPet, setHasPet] = useState(settings.hasPet);

  function handleSaveFamily() {
    const oldCount = settings.memberCount;
    saveSettings({ ...settings, memberCount, hasPet });
    if (oldCount !== memberCount) {
      const updatedCount = items.filter((i) => i.recommendedQuantity > 0).length;
      Alert.alert(
        '保存しました',
        `家族人数を${oldCount}人 → ${memberCount}人に変更しました。\n${updatedCount}件の推奨数量を自動更新しました。`
      );
    } else {
      Alert.alert('保存しました', '家族設定を更新しました。');
    }
  }

  async function handleExportCSV() {
    if (items.length === 0) {
      Alert.alert('データなし', '備蓄品が登録されていません。');
      return;
    }

    const header = '商品名,カテゴリ,数量,単位,推奨数量,賞味期限,登録日\n';
    const rows = items.map((item) =>
      [
        `"${item.name}"`,
        item.category,
        item.quantity,
        item.unit,
        item.recommendedQuantity,
        item.expiryDate !== '2099-12-31' ? item.expiryDate : '未設定',
        item.createdAt.split('T')[0],
      ].join(',')
    );
    const csv = header + rows.join('\n');

    const file = new File(Paths.document, 'bosai_stock.csv');
    file.create();
    file.write(csv);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: '備蓄データをエクスポート',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('共有不可', 'このデバイスでは共有できません。');
    }
  }

  function handleResetData() {
    Alert.alert(
      'データをリセット',
      'すべての備蓄品データが削除されます。本当によろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            items.forEach((item) => useStore.getState().deleteItem(item.id));
            Alert.alert('完了', 'すべてのデータを削除しました。');
          },
        },
      ]
    );
  }

  const totalItems = items.length;
  const registeredItems = items.filter((i) => i.quantity > 0).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>設定</Text>

        {/* 統計サマリ */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalItems}</Text>
            <Text style={styles.statLabel}>登録品目</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{registeredItems}</Text>
            <Text style={styles.statLabel}>在庫あり</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{settings.memberCount}人</Text>
            <Text style={styles.statLabel}>家族人数</Text>
          </View>
        </View>

        {/* 家族設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 家族設定</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>家族人数</Text>
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
          </View>

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowLabel}>🐾 ペットあり</Text>
            <Switch
              value={hasPet}
              onValueChange={setHasPet}
              trackColor={{ true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFamily}>
            <Text style={styles.saveBtnText}>保存する</Text>
          </TouchableOpacity>
        </View>

        {/* データ管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 データ管理</Text>

          <TouchableOpacity style={styles.menuRow} onPress={handleExportCSV}>
            <View>
              <Text style={styles.menuLabel}>CSVでエクスポート</Text>
              <Text style={styles.menuDesc}>備蓄データをスプレッドシートで管理</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={handleResetData}
          >
            <View>
              <Text style={[styles.menuLabel, { color: Colors.danger }]}>データをリセット</Text>
              <Text style={styles.menuDesc}>すべての備蓄品を削除します</Text>
            </View>
            <Text style={[styles.menuArrow, { color: Colors.danger }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ アプリ情報</Text>
          <View style={styles.menuRow}>
            <Text style={styles.menuLabel}>バージョン</Text>
            <Text style={styles.menuValue}>1.0.0</Text>
          </View>
          <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.menuLabel}>備蓄基準</Text>
            <Text style={styles.menuValue}>内閣府推奨（7日分）</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          南海トラフ地震の発生確率は今後30年で70〜80%。{'\n'}
          日頃の備蓄管理が命を守ります。🛡️
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.subText, marginTop: 2 },
  section: {
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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.subText, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: 15, color: Colors.text },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  counterValue: { fontSize: 16, fontWeight: '700', color: Colors.text, minWidth: 40, textAlign: 'center' },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  menuDesc: { fontSize: 12, color: Colors.subText, marginTop: 2 },
  menuValue: { fontSize: 14, color: Colors.subText },
  menuArrow: { fontSize: 20, color: Colors.subText },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.subText,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
