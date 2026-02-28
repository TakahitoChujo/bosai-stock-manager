import * as SQLite from 'expo-sqlite';
import { StockItem, FamilySettings } from '../types';

const db = SQLite.openDatabaseSync('bosai.db');

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '個',
      expiry_date TEXT NOT NULL,
      recommended_quantity REAL NOT NULL DEFAULT 0,
      barcode TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      member_count INTEGER NOT NULL DEFAULT 1,
      has_pet INTEGER NOT NULL DEFAULT 0,
      is_onboarded INTEGER NOT NULL DEFAULT 0,
      notify_days TEXT NOT NULL DEFAULT '[90,30,7]'
    );
  `);

  // Insert default settings row if not exists
  const existing = db.getFirstSync('SELECT id FROM family_settings WHERE id = 1');
  if (!existing) {
    db.runSync(
      `INSERT INTO family_settings (id, member_count, has_pet, is_onboarded, notify_days)
       VALUES (1, 1, 0, 0, '[90,30,7]')`
    );
  }
}

// --- FamilySettings ---

export function getFamilySettings(): FamilySettings {
  const row = db.getFirstSync<{
    member_count: number;
    has_pet: number;
    is_onboarded: number;
    notify_days: string;
  }>('SELECT * FROM family_settings WHERE id = 1');

  if (!row) {
    return { memberCount: 1, hasPet: false, isOnboarded: false, notifyDays: [90, 30, 7] };
  }

  let notifyDays: number[] = [90, 30, 7];
  try {
    const parsed = JSON.parse(row.notify_days);
    if (Array.isArray(parsed) && parsed.every((d) => typeof d === 'number')) {
      notifyDays = parsed;
    }
  } catch {
    // パース失敗時はデフォルト値を使用
  }

  return {
    memberCount: row.member_count,
    hasPet: row.has_pet === 1,
    isOnboarded: row.is_onboarded === 1,
    notifyDays,
  };
}

export function saveFamilySettings(settings: FamilySettings) {
  db.runSync(
    `UPDATE family_settings SET
      member_count = ?,
      has_pet = ?,
      is_onboarded = ?,
      notify_days = ?
     WHERE id = 1`,
    [
      settings.memberCount,
      settings.hasPet ? 1 : 0,
      settings.isOnboarded ? 1 : 0,
      JSON.stringify(settings.notifyDays),
    ]
  );
}

// --- StockItems ---

function rowToItem(row: any): StockItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    expiryDate: row.expiry_date,
    recommendedQuantity: row.recommended_quantity,
    barcode: row.barcode ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllItems(): StockItem[] {
  const rows = db.getAllSync<any>('SELECT * FROM stock_items ORDER BY expiry_date ASC');
  return rows.map(rowToItem);
}

export function getItemsByCategory(category: string): StockItem[] {
  const rows = db.getAllSync<any>(
    'SELECT * FROM stock_items WHERE category = ? ORDER BY expiry_date ASC',
    [category]
  );
  return rows.map(rowToItem);
}

export function insertItem(item: Omit<StockItem, 'id'>): number {
  const now = new Date().toISOString();
  const result = db.runSync(
    `INSERT INTO stock_items
      (name, category, quantity, unit, expiry_date, recommended_quantity, barcode, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.expiryDate,
      item.recommendedQuantity,
      item.barcode ?? null,
      now,
      now,
    ]
  );
  return result.lastInsertRowId;
}

export function updateItem(item: StockItem) {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE stock_items SET
      name = ?,
      category = ?,
      quantity = ?,
      unit = ?,
      expiry_date = ?,
      recommended_quantity = ?,
      barcode = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.expiryDate,
      item.recommendedQuantity,
      item.barcode ?? null,
      now,
      item.id,
    ]
  );
}

export function deleteItem(id: number) {
  db.runSync('DELETE FROM stock_items WHERE id = ?', [id]);
}

export function updateQuantity(id: number, quantity: number) {
  const now = new Date().toISOString();
  db.runSync(
    'UPDATE stock_items SET quantity = ?, updated_at = ? WHERE id = ?',
    [quantity, now, id]
  );
}
