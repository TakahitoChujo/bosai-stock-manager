// DB モジュールを先にモック（useStore のインポートより前）
jest.mock('../src/database/db', () => ({
  getAllItems: jest.fn(() => []),
  getFamilySettings: jest.fn(() => ({
    memberCount: 1,
    hasPet: false,
    isOnboarded: false,
    notifyDays: [90, 30, 7],
  })),
  insertItem: jest.fn(() => 1),
  updateItem: jest.fn(),
  updateQuantity: jest.fn(),
  deleteItem: jest.fn(),
  saveFamilySettings: jest.fn(),
  initDB: jest.fn(),
}));

import * as DB from '../src/database/db';
import { useStore } from '../src/store/useStore';
import { StockItem, FamilySettings } from '../src/types';
import { RECOMMENDED_CHECKLIST } from '../src/constants/checklist';

// ----------------------------------------------------------------
// テストヘルパー
// ----------------------------------------------------------------
let itemIdCounter = 1;

function makeItem(overrides: Partial<StockItem> = {}): StockItem {
  return {
    id: itemIdCounter++,
    name: 'テスト品目',
    category: '水',
    quantity: 10,
    unit: '本',
    expiryDate: '2099-12-31',
    recommendedQuantity: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const defaultSettings: FamilySettings = {
  memberCount: 1,
  hasPet: false,
  isOnboarded: false,
  notifyDays: [90, 30, 7],
};

beforeEach(() => {
  itemIdCounter = 1;
  useStore.setState({
    items: [],
    settings: { ...defaultSettings },
    isLoading: false,
  });
  jest.clearAllMocks();
});

// ----------------------------------------------------------------
// getOverallScore
// ----------------------------------------------------------------
describe('getOverallScore', () => {
  it('アイテムが0件のとき0を返す', () => {
    expect(useStore.getState().getOverallScore()).toBe(0);
  });

  it('推奨量100%達成のとき100を返す', () => {
    useStore.setState({ items: [makeItem({ quantity: 10, recommendedQuantity: 10 })] });
    expect(useStore.getState().getOverallScore()).toBe(100);
  });

  it('推奨量0%のとき0を返す', () => {
    useStore.setState({ items: [makeItem({ quantity: 0, recommendedQuantity: 10 })] });
    expect(useStore.getState().getOverallScore()).toBe(0);
  });

  it('推奨量50%のとき50を返す', () => {
    useStore.setState({ items: [makeItem({ quantity: 5, recommendedQuantity: 10 })] });
    expect(useStore.getState().getOverallScore()).toBe(50);
  });

  it('推奨量を超えても100にキャップされる', () => {
    useStore.setState({ items: [makeItem({ quantity: 20, recommendedQuantity: 10 })] });
    expect(useStore.getState().getOverallScore()).toBe(100);
  });

  it('複数アイテムの平均を返す', () => {
    useStore.setState({
      items: [
        makeItem({ quantity: 10, recommendedQuantity: 10 }), // 100%
        makeItem({ quantity: 0, recommendedQuantity: 10 }),  // 0%
      ],
    });
    expect(useStore.getState().getOverallScore()).toBe(50);
  });

  it('recommendedQuantity=0 のアイテムは達成済み扱い（100%）', () => {
    useStore.setState({ items: [makeItem({ quantity: 0, recommendedQuantity: 0 })] });
    expect(useStore.getState().getOverallScore()).toBe(100);
  });
});

// ----------------------------------------------------------------
// getExpiringItems
// ----------------------------------------------------------------
describe('getExpiringItems', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-02T00:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('デフォルト30日以内に期限が来るアイテムを返す', () => {
    const expiring = makeItem({ expiryDate: '2026-03-20' }); // 18日後
    const safe = makeItem({ expiryDate: '2026-05-01' });     // 60日後
    useStore.setState({ items: [expiring, safe] });
    const result = useStore.getState().getExpiringItems();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(expiring.id);
  });

  it('当日期限のアイテムも含まれる', () => {
    const today = makeItem({ expiryDate: '2026-03-02' });
    useStore.setState({ items: [today] });
    expect(useStore.getState().getExpiringItems()).toHaveLength(1);
  });

  it('期限切れ（過去）のアイテムは含まれない', () => {
    const expired = makeItem({ expiryDate: '2026-03-01' });
    useStore.setState({ items: [expired] });
    expect(useStore.getState().getExpiringItems()).toHaveLength(0);
  });

  it('days パラメータで閾値を変更できる', () => {
    const item7 = makeItem({ expiryDate: '2026-03-09' });  // 7日後
    const item14 = makeItem({ expiryDate: '2026-03-16' }); // 14日後
    useStore.setState({ items: [item7, item14] });

    expect(useStore.getState().getExpiringItems(7)).toHaveLength(1);
    expect(useStore.getState().getExpiringItems(14)).toHaveLength(2);
  });

  it('アイテムが0件のとき空配列を返す', () => {
    expect(useStore.getState().getExpiringItems()).toHaveLength(0);
  });
});

// ----------------------------------------------------------------
// getLowStockItems
// ----------------------------------------------------------------
describe('getLowStockItems', () => {
  it('ratio < 0.5 のアイテムを返す', () => {
    const low = makeItem({ quantity: 4, recommendedQuantity: 10 }); // 40%
    const ok = makeItem({ quantity: 8, recommendedQuantity: 10 });  // 80%
    useStore.setState({ items: [low, ok] });
    const result = useStore.getState().getLowStockItems();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(low.id);
  });

  it('ちょうど50%は不足扱いにならない', () => {
    const half = makeItem({ quantity: 5, recommendedQuantity: 10 }); // 50%
    useStore.setState({ items: [half] });
    expect(useStore.getState().getLowStockItems()).toHaveLength(0);
  });

  it('recommendedQuantity=0 のアイテムは不足扱いにならない', () => {
    const item = makeItem({ quantity: 0, recommendedQuantity: 0 });
    useStore.setState({ items: [item] });
    expect(useStore.getState().getLowStockItems()).toHaveLength(0);
  });
});

// ----------------------------------------------------------------
// getCategorySummaries
// ----------------------------------------------------------------
describe('getCategorySummaries', () => {
  it('アイテム未登録のカテゴリは「未登録」を返す', () => {
    useStore.setState({ items: [] });
    const summaries = useStore.getState().getCategorySummaries();
    expect(summaries.every((s) => s.status === '未登録')).toBe(true);
  });

  it('十分な在庫があるカテゴリは「十分」を返す', () => {
    useStore.setState({
      items: [makeItem({ category: '水', quantity: 10, recommendedQuantity: 10, expiryDate: '2099-12-31' })],
    });
    const water = useStore.getState().getCategorySummaries().find((s) => s.category === '水');
    expect(water?.status).toBe('十分');
  });

  it('在庫が50%未満のカテゴリは「不足」を返す', () => {
    useStore.setState({
      items: [makeItem({ category: '水', quantity: 4, recommendedQuantity: 10, expiryDate: '2099-12-31' })],
    });
    const water = useStore.getState().getCategorySummaries().find((s) => s.category === '水');
    expect(water?.status).toBe('不足');
  });

  it('在庫が50%以上80%未満のカテゴリは「注意」を返す', () => {
    useStore.setState({
      items: [makeItem({ category: '水', quantity: 6, recommendedQuantity: 10, expiryDate: '2099-12-31' })],
    });
    const water = useStore.getState().getCategorySummaries().find((s) => s.category === '水');
    expect(water?.status).toBe('注意');
  });

  it('30日以内に期限切れのアイテムがあるカテゴリは「不足」になる', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-02T00:00:00'));

    useStore.setState({
      items: [makeItem({ category: '食料', quantity: 10, recommendedQuantity: 10, expiryDate: '2026-03-20' })],
    });
    const food = useStore.getState().getCategorySummaries().find((s) => s.category === '食料');
    expect(food?.status).toBe('不足');

    jest.useRealTimers();
  });

  it('全カテゴリが返される', () => {
    const summaries = useStore.getState().getCategorySummaries();
    expect(summaries.map((s) => s.category)).toEqual(
      expect.arrayContaining(['水', '食料', '電池', '薬・衛生', 'その他'])
    );
  });
});

// ----------------------------------------------------------------
// addItem
// ----------------------------------------------------------------
describe('addItem', () => {
  it('アイテムをストアに追加する', () => {
    (DB.insertItem as jest.Mock).mockReturnValue(42);

    useStore.getState().addItem({
      name: '飲料水',
      category: '水',
      quantity: 5,
      unit: '本',
      expiryDate: '2027-01-01',
      recommendedQuantity: 10,
      createdAt: '',
      updatedAt: '',
    });

    const items = useStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('飲料水');
    expect(items[0].id).toBe(42);
  });

  it('DB.insertItem を呼び出す', () => {
    useStore.getState().addItem({
      name: '飲料水',
      category: '水',
      quantity: 5,
      unit: '本',
      expiryDate: '2027-01-01',
      recommendedQuantity: 10,
      createdAt: '',
      updatedAt: '',
    });
    expect(DB.insertItem).toHaveBeenCalledTimes(1);
  });

  it('expiryDate の昇順でソートされる', () => {
    (DB.insertItem as jest.Mock).mockReturnValueOnce(1).mockReturnValueOnce(2);

    useStore.getState().addItem({
      name: '後で期限切れ',
      category: '食料',
      quantity: 1,
      unit: '個',
      expiryDate: '2028-01-01',
      recommendedQuantity: 1,
      createdAt: '',
      updatedAt: '',
    });
    useStore.getState().addItem({
      name: '先に期限切れ',
      category: '食料',
      quantity: 1,
      unit: '個',
      expiryDate: '2027-01-01',
      recommendedQuantity: 1,
      createdAt: '',
      updatedAt: '',
    });

    const items = useStore.getState().items;
    expect(items[0].name).toBe('先に期限切れ');
    expect(items[1].name).toBe('後で期限切れ');
  });
});

// ----------------------------------------------------------------
// deleteItem
// ----------------------------------------------------------------
describe('deleteItem', () => {
  it('指定IDのアイテムをストアから削除する', () => {
    const item = makeItem({ id: 99 });
    useStore.setState({ items: [item] });

    useStore.getState().deleteItem(99);

    expect(useStore.getState().items).toHaveLength(0);
  });

  it('他のアイテムは残る', () => {
    const a = makeItem({ id: 1 });
    const b = makeItem({ id: 2 });
    useStore.setState({ items: [a, b] });

    useStore.getState().deleteItem(1);

    const remaining = useStore.getState().items;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(2);
  });

  it('DB.deleteItem を呼び出す', () => {
    useStore.setState({ items: [makeItem({ id: 1 })] });
    useStore.getState().deleteItem(1);
    expect(DB.deleteItem).toHaveBeenCalledWith(1);
  });
});

// ----------------------------------------------------------------
// consumeItem
// ----------------------------------------------------------------
describe('consumeItem', () => {
  it('指定量だけ数量を減らす', () => {
    useStore.setState({ items: [makeItem({ id: 1, quantity: 10 })] });
    useStore.getState().consumeItem(1, 3);
    expect(useStore.getState().items[0].quantity).toBe(7);
  });

  it('数量は0を下回らない', () => {
    useStore.setState({ items: [makeItem({ id: 1, quantity: 2 })] });
    useStore.getState().consumeItem(1, 10);
    expect(useStore.getState().items[0].quantity).toBe(0);
  });

  it('DB.updateQuantity を呼び出す', () => {
    useStore.setState({ items: [makeItem({ id: 1, quantity: 10 })] });
    useStore.getState().consumeItem(1, 3);
    expect(DB.updateQuantity).toHaveBeenCalledWith(1, 7);
  });

  it('存在しないIDは何もしない', () => {
    useStore.setState({ items: [makeItem({ id: 1, quantity: 10 })] });
    useStore.getState().consumeItem(999, 5);
    expect(useStore.getState().items[0].quantity).toBe(10);
    expect(DB.updateQuantity).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// saveSettings — 家族人数変更によるスケーリング
// ----------------------------------------------------------------
describe('saveSettings: 家族人数スケーリング', () => {
  it('人数増加時に推奨数量が比例してスケールされる', () => {
    const item = makeItem({ id: 1, name: '飲料水（2Lペット）', quantity: 0, recommendedQuantity: 10 });
    useStore.setState({ items: [item], settings: { ...defaultSettings, memberCount: 1 } });

    useStore.getState().saveSettings({ ...defaultSettings, memberCount: 2 });

    expect(useStore.getState().items[0].recommendedQuantity).toBe(20);
  });

  it('人数減少時に推奨数量が比例してスケールされる', () => {
    const item = makeItem({ id: 1, name: '飲料水（2Lペット）', quantity: 0, recommendedQuantity: 20 });
    useStore.setState({ items: [item], settings: { ...defaultSettings, memberCount: 2 } });

    useStore.getState().saveSettings({ ...defaultSettings, memberCount: 1 });

    expect(useStore.getState().items[0].recommendedQuantity).toBe(10);
  });

  it('ペット品目は人数変更でスケールされない', () => {
    const petItemName = RECOMMENDED_CHECKLIST.find((i) => i.isPetItem)!.name;
    const petItem = makeItem({ id: 1, name: petItemName, recommendedQuantity: 5 });
    useStore.setState({ items: [petItem], settings: { ...defaultSettings, memberCount: 1 } });

    useStore.getState().saveSettings({ ...defaultSettings, memberCount: 3 });

    expect(useStore.getState().items[0].recommendedQuantity).toBe(5);
  });

  it('recommendedQuantity=0 のアイテムはスケールされない', () => {
    const item = makeItem({ id: 1, name: '携帯ラジオ', recommendedQuantity: 0 });
    useStore.setState({ items: [item], settings: { ...defaultSettings, memberCount: 1 } });

    useStore.getState().saveSettings({ ...defaultSettings, memberCount: 3 });

    expect(useStore.getState().items[0].recommendedQuantity).toBe(0);
  });
});

// ----------------------------------------------------------------
// saveSettings — ペット設定トグル
// ----------------------------------------------------------------
describe('saveSettings: ペット設定', () => {
  const petItemCount = RECOMMENDED_CHECKLIST.filter((i) => i.isPetItem).length;

  it('hasPet を false → true にするとペット品目が追加される', () => {
    // insertItem がユニークなIDを返すように設定
    let nextId = 100;
    (DB.insertItem as jest.Mock).mockImplementation(() => nextId++);

    useStore.setState({ items: [], settings: { ...defaultSettings, hasPet: false } });

    useStore.getState().saveSettings({ ...defaultSettings, hasPet: true });

    expect(useStore.getState().items).toHaveLength(petItemCount);
    expect(useStore.getState().items.every((i) => i.quantity === 0)).toBe(true);
  });

  it('hasPet を true → false にするとペット品目が削除される', () => {
    const petItems = RECOMMENDED_CHECKLIST.filter((i) => i.isPetItem).map((checklist, idx) =>
      makeItem({ id: idx + 10, name: checklist.name, category: checklist.category })
    );
    const normalItem = makeItem({ id: 99, name: '飲料水（2Lペット）', category: '水' });
    useStore.setState({
      items: [...petItems, normalItem],
      settings: { ...defaultSettings, hasPet: true },
    });

    useStore.getState().saveSettings({ ...defaultSettings, hasPet: false });

    const remaining = useStore.getState().items;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('飲料水（2Lペット）');
  });

  it('すでにペット品目が存在する場合は重複追加しない', () => {
    let nextId = 200;
    (DB.insertItem as jest.Mock).mockImplementation(() => nextId++);

    const firstPet = RECOMMENDED_CHECKLIST.find((i) => i.isPetItem)!;
    const existingPetItem = makeItem({ id: 1, name: firstPet.name, category: firstPet.category });
    useStore.setState({
      items: [existingPetItem],
      settings: { ...defaultSettings, hasPet: false },
    });

    useStore.getState().saveSettings({ ...defaultSettings, hasPet: true });

    const petNames = new Set(RECOMMENDED_CHECKLIST.filter((i) => i.isPetItem).map((i) => i.name));
    const petItemsInStore = useStore.getState().items.filter((i) => petNames.has(i.name));
    // 既存1件 + 新規追加（重複なし）= petItemCount件
    expect(petItemsInStore).toHaveLength(petItemCount);
  });
});
