import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { CATEGORIES, CATEGORY_ICONS, RECOMMENDED_CHECKLIST, calcRecommended } from '../constants/checklist';
import { Category } from '../types';
import { RootStackParamList } from '../navigation';

type AddItemRoute = RouteProp<RootStackParamList, 'AddItem'>;

const UNITS = ['本', '個', '缶', '食', '袋', '枚', '回分', 'セット', 'L', 'kg'];

export default function AddItemScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddItemRoute>();
  const { addItem, updateItem, items, settings } = useStore();

  const editItemId = route.params?.editItemId;
  const editItem = editItemId ? items.find((i) => i.id === editItemId) : undefined;
  const isEdit = !!editItem;

  function getDefaultsForCategory(cat: Category) {
    const first = RECOMMENDED_CHECKLIST.find((i) => i.category === cat && !i.isPetItem);
    if (!first) return { recommendedQty: '', unit: '個' };
    return {
      recommendedQty: String(calcRecommended(first, settings.memberCount)),
      unit: first.unit,
    };
  }

  const parseExpiry = (d: string) => {
    const parts = d.split('-');
    return { y: parts[0] ?? '2026', m: parts[1] ?? '12', d: parts[2] ?? '31' };
  };
  const initExpiry = parseExpiry(editItem?.expiryDate ?? '2026-12-31');

  const initCategory: Category = editItem?.category ?? (route.params?.category as Category) ?? '水';
  const initDefaults = getDefaultsForCategory(initCategory);

  const [name, setName] = useState(editItem?.name ?? '');
  const [category, setCategory] = useState<Category>(initCategory);
  const [quantity, setQuantity] = useState(String(editItem?.quantity ?? 0));
  const [recommendedQty, setRecommendedQty] = useState(
    editItem ? String(editItem.recommendedQuantity) : initDefaults.recommendedQty
  );
  const [unit, setUnit] = useState(editItem?.unit ?? initDefaults.unit);

  function handleCategoryChange(cat: Category) {
    setCategory(cat);
    if (!isEdit) {
      const d = getDefaultsForCategory(cat);
      setRecommendedQty(d.recommendedQty);
      setUnit(d.unit);
    }
  }
  const [expiryYear, setExpiryYear] = useState(initExpiry.y);
  const [expiryMonth, setExpiryMonth] = useState(initExpiry.m);
  const [expiryDay, setExpiryDay] = useState(initExpiry.d);
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(editItem?.barcode ?? '');
  const [permission, requestPermission] = useCameraPermissions();

  async function handleScan() {
    if (!permission?.granted) {
      Alert.alert(
        'カメラアクセスが必要です',
        'バーコードをスキャンして商品情報を自動取得するために、カメラへのアクセスを許可してください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '許可する',
            onPress: async () => {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert('設定が必要です', '設定アプリからカメラへのアクセスを許可してください。');
              } else {
                setScanning(true);
              }
            },
          },
        ]
      );
      return;
    }
    setScanning(true);
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    setScanning(false);
    setLookingUp(true);
    setScannedBarcode(data);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(data)}.json`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const product = json.product;
        const rawName: string =
          product.product_name_ja ||
          product.product_name ||
          product.abbreviated_product_name ||
          '';
        const productName = rawName.trim().slice(0, 255);
        if (productName) {
          setName(productName);
        } else {
          Alert.alert('商品が見つかりません', '商品名を手動で入力してください。');
        }
      } else {
        Alert.alert('商品が見つかりません', '商品名を手動で入力してください。');
      }
    } catch {
      Alert.alert('通信エラー', '商品情報を取得できませんでした。\n商品名を手動で入力してください。');
    } finally {
      clearTimeout(timeoutId);
      setLookingUp(false);
    }
  }

  function isValidDate(year: number, month: number, day: number): boolean {
    if (year < 2000 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) daysInMonth[1] = 29;
    return day >= 1 && day <= daysInMonth[month - 1];
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('入力エラー', '商品名を入力してください。');
      return;
    }
    if (trimmedName.length > 255) {
      Alert.alert('入力エラー', '商品名は255文字以内で入力してください。');
      return;
    }
    const year = parseInt(expiryYear);
    const month = parseInt(expiryMonth);
    const day = parseInt(expiryDay);
    if (isNaN(year) || isNaN(month) || isNaN(day) || !isValidDate(year, month, day)) {
      Alert.alert('入力エラー', '賞味期限を正しく入力してください。');
      return;
    }

    const expiryDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec = parseFloat(recommendedQty) || 0;

    if (isEdit && editItem) {
      updateItem({
        ...editItem,
        name: trimmedName,
        category,
        quantity: parseFloat(quantity) || 0,
        unit,
        expiryDate,
        recommendedQuantity: rec,
        barcode: scannedBarcode || editItem.barcode,
      });
    } else {
      addItem({
        name: trimmedName,
        category,
        quantity: parseFloat(quantity) || 0,
        unit,
        expiryDate,
        recommendedQuantity: rec,
        barcode: scannedBarcode || undefined,
      });
    }

    navigation.goBack();
  }

  if (scanning) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <TouchableOpacity style={styles.cancelScan} onPress={() => setScanning(false)}>
          <Text style={styles.cancelScanText}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* バーコードスキャン */}
      {lookingUp ? (
        <View style={styles.scanBtn}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.scanText}>商品情報を検索中...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.scanBtn} onPress={handleScan}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanText}>
            {scannedBarcode ? `再スキャン（${scannedBarcode}）` : 'バーコードをスキャン'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.divider}>または手動で入力</Text>

      {/* 商品名 */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>商品名 *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: 水（2Lペットボトル）"
          placeholderTextColor={Colors.disabled}
        />
      </View>

      {/* カテゴリ */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>カテゴリ</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
              onPress={() => handleCategoryChange(cat as Category)}
            >
              <Text style={styles.categoryBtnIcon}>{CATEGORY_ICONS[cat]}</Text>
              <Text style={[styles.categoryBtnText, category === cat && styles.categoryBtnTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 数量・単位 */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>現在の数量</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.disabled}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>推奨数量</Text>
          <TextInput
            style={styles.input}
            value={recommendedQty}
            onChangeText={setRecommendedQty}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.disabled}
          />
        </View>
      </View>

      {/* 単位選択 */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>単位</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.unitRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 賞味期限 */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>賞味期限</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            value={expiryYear}
            onChangeText={setExpiryYear}
            keyboardType="numeric"
            maxLength={4}
            placeholder="2026"
            placeholderTextColor={Colors.disabled}
          />
          <Text style={styles.dateSep}>/</Text>
          <TextInput
            style={[styles.input, styles.dateInputSmall]}
            value={expiryMonth}
            onChangeText={setExpiryMonth}
            keyboardType="numeric"
            maxLength={2}
            placeholder="12"
            placeholderTextColor={Colors.disabled}
          />
          <Text style={styles.dateSep}>/</Text>
          <TextInput
            style={[styles.input, styles.dateInputSmall]}
            value={expiryDay}
            onChangeText={setExpiryDay}
            keyboardType="numeric"
            maxLength={2}
            placeholder="31"
            placeholderTextColor={Colors.disabled}
          />
        </View>
      </View>

      {/* 保存ボタン */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>登録する</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  scanBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  scanIcon: { fontSize: 24 },
  scanText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  divider: {
    textAlign: 'center',
    color: Colors.subText,
    fontSize: 13,
    marginBottom: 16,
  },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryBtnIcon: { fontSize: 14 },
  categoryBtnText: { fontSize: 13, color: Colors.subText },
  categoryBtnTextActive: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  unitRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  unitBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitBtnText: { fontSize: 13, color: Colors.subText },
  unitBtnTextActive: { color: '#fff', fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 2, textAlign: 'center' },
  dateInputSmall: { flex: 1, textAlign: 'center' },
  dateSep: { fontSize: 18, color: Colors.subText },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelScan: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cancelScanText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
