export type Category = '水' | '食料' | '電池' | '薬・衛生' | 'その他';

export type StockStatus = '十分' | '注意' | '不足' | '未登録';

export interface StockItem {
  id: number;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  expiryDate: string; // ISO date string YYYY-MM-DD
  recommendedQuantity: number;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilySettings {
  memberCount: number;
  hasPet: boolean;
  isOnboarded: boolean;
  notifyDays: number[]; // e.g. [90, 30, 7]
}

export interface ChecklistItem {
  name: string;
  category: Category;
  unit: string;
  quantityPerPerson: number; // 0 の場合は familyFixed または 1 を使用
  familyFixed?: number;      // 家族全体での固定数量（人数に関係なく一定）
  isPetItem?: boolean;       // ペット専用品目フラグ
  description: string;
}

export interface CategorySummary {
  category: Category;
  status: StockStatus;
  total: number;
  recommended: number;
  icon: string;
}
