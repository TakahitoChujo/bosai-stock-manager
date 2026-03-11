import { create } from 'zustand';
import { StockItem, FamilySettings, CategorySummary, Category } from '../types';
import * as DB from '../database/db';
import { CATEGORY_ICONS, CATEGORIES, RECOMMENDED_CHECKLIST, calcRecommended } from '../constants/checklist';
import { getDaysUntilExpiry } from '../utils/helpers';

interface StoreState {
  items: StockItem[];
  settings: FamilySettings;
  isLoading: boolean;

  // Actions
  loadAll: () => void;
  addItem: (item: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (item: StockItem) => void;
  deleteItem: (id: number) => void;
  consumeItem: (id: number, amount: number) => void;
  saveSettings: (settings: FamilySettings) => void;

  // Derived
  getCategorySummaries: () => CategorySummary[];
  getExpiringItems: (days?: number) => StockItem[];
  getLowStockItems: () => StockItem[];
  getOverallScore: () => number;
}

export const useStore = create<StoreState>((set, get) => ({
  items: [],
  settings: { memberCount: 1, hasPet: false, isOnboarded: false, notifyDays: [90, 30, 7] },
  isLoading: true,

  loadAll: () => {
    const items = DB.getAllItems();
    const settings = DB.getFamilySettings();
    set({ items, settings, isLoading: false });
  },

  addItem: (item) => {
    const now = new Date().toISOString();
    const id = DB.insertItem({ ...item, createdAt: now, updatedAt: now });
    const newItem: StockItem = { ...item, id, createdAt: now, updatedAt: now };
    set((s) => ({ items: [...s.items, newItem].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)) }));
  },

  updateItem: (item) => {
    DB.updateItem(item);
    set((s) => ({
      items: s.items.map((i) => (i.id === item.id ? item : i)),
    }));
  },

  deleteItem: (id) => {
    DB.deleteItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  consumeItem: (id, amount) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const newQuantity = Math.max(0, item.quantity - amount);
    DB.updateQuantity(id, newQuantity);
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, quantity: newQuantity } : i)),
    }));
  },

  saveSettings: (newSettings) => {
    const { settings, items } = get();
    const oldCount = settings.memberCount;
    const newCount = newSettings.memberCount;
    const oldHasPet = settings.hasPet;
    const newHasPet = newSettings.hasPet;

    // ペット品目の名前セット（スケーリング除外・削除判定用）
    const petItemNames = new Set(
      RECOMMENDED_CHECKLIST.filter((i) => i.isPetItem).map((i) => i.name)
    );

    let updatedItems = [...items];

    // 人数変更時：推奨数量をスケーリング（ペット品目は除外）
    if (oldCount !== newCount && oldCount > 0) {
      updatedItems = updatedItems.map((item) => {
        if (item.recommendedQuantity === 0) return item;
        if (petItemNames.has(item.name)) return item;
        const newRecommended = Math.round((item.recommendedQuantity / oldCount) * newCount);
        const updated = { ...item, recommendedQuantity: newRecommended };
        DB.updateItem(updated);
        return updated;
      });
    }

    // hasPet 変更時：ペット品目を追加または削除
    if (oldHasPet !== newHasPet) {
      const petChecklist = RECOMMENDED_CHECKLIST.filter((i) => i.isPetItem);
      if (newHasPet) {
        const existingNames = new Set(updatedItems.map((i) => i.name));
        const farFuture = '2099-12-31';
        const now = new Date().toISOString();
        petChecklist
          .filter((item) => !existingNames.has(item.name))
          .forEach((item) => {
            const recommendedQuantity = calcRecommended(item, newCount);
            const id = DB.insertItem({
              name: item.name,
              category: item.category,
              quantity: 0,
              unit: item.unit,
              expiryDate: farFuture,
              recommendedQuantity,
              createdAt: now,
              updatedAt: now,
            });
            updatedItems.push({
              id,
              name: item.name,
              category: item.category,
              quantity: 0,
              unit: item.unit,
              expiryDate: farFuture,
              recommendedQuantity,
              createdAt: now,
              updatedAt: now,
            });
          });
      } else {
        updatedItems
          .filter((i) => petItemNames.has(i.name))
          .forEach((item) => DB.deleteItem(item.id));
        updatedItems = updatedItems.filter((i) => !petItemNames.has(i.name));
      }
    }

    DB.saveFamilySettings(newSettings);
    set({ settings: newSettings, items: updatedItems });
  },

  getCategorySummaries: (): CategorySummary[] => {
    const { items } = get();
    return CATEGORIES.map((category) => {
      const catItems = items.filter((i) => i.category === category);
      if (catItems.length === 0) {
        return {
          category: category as Category,
          status: '未登録',
          total: 0,
          recommended: 0,
          icon: CATEGORY_ICONS[category],
        };
      }
      const total = catItems.reduce((sum, i) => sum + i.quantity, 0);
      const recommended = catItems.reduce((sum, i) => sum + i.recommendedQuantity, 0);
      const ratio = recommended > 0 ? total / recommended : 1;
      const hasExpiring = catItems.some((i) => getDaysUntilExpiry(i.expiryDate) <= 30);

      let status: CategorySummary['status'];
      if (hasExpiring || ratio < 0.5) status = '不足';
      else if (ratio < 0.8) status = '注意';
      else status = '十分';

      return {
        category: category as Category,
        status,
        total,
        recommended,
        icon: CATEGORY_ICONS[category],
      };
    });
  },

  getExpiringItems: (days = 30) => {
    return get().items.filter((i) => {
      const d = getDaysUntilExpiry(i.expiryDate);
      return d >= 0 && d <= days;
    });
  },

  getLowStockItems: () => {
    return get().items.filter((i) => {
      const ratio = i.recommendedQuantity > 0 ? i.quantity / i.recommendedQuantity : 1;
      return ratio < 0.5;
    });
  },

  getOverallScore: () => {
    const { items } = get();
    if (items.length === 0) return 0;
    const totalRatio = items.reduce((sum, i) => {
      const ratio = i.recommendedQuantity > 0 ? i.quantity / i.recommendedQuantity : 1;
      return sum + Math.min(ratio, 1);
    }, 0);
    return Math.round((totalRatio / items.length) * 100);
  },
}));
