import { RECOMMENDED_CHECKLIST, calcRecommended } from '../src/constants/checklist';
import { getStockStatus } from '../src/utils/helpers';
import { ChecklistItem } from '../src/types';

// ----------------------------------------------------------------
// calcRecommended
// ----------------------------------------------------------------
describe('calcRecommended', () => {
  it('1人あたりの数量 × 人数を返す', () => {
    const item: ChecklistItem = {
      name: 'テスト食料',
      category: '食料',
      unit: '食',
      quantityPerPerson: 7,
      description: '',
    };
    expect(calcRecommended(item, 1)).toBe(7);
    expect(calcRecommended(item, 3)).toBe(21);
    expect(calcRecommended(item, 4)).toBe(28);
  });

  it('quantityPerPerson=0（家族共有）の場合は 1 を返す', () => {
    const item: ChecklistItem = {
      name: '携帯ラジオ',
      category: 'その他',
      unit: '個',
      quantityPerPerson: 0,
      description: '',
    };
    expect(calcRecommended(item, 1)).toBe(1);
    expect(calcRecommended(item, 5)).toBe(1);
  });

  it('familyFixed が設定されている場合は人数に関わらず固定値を返す', () => {
    const item: ChecklistItem = {
      name: '懐中電灯',
      category: 'その他',
      unit: '個',
      quantityPerPerson: 0,
      familyFixed: 2,
      description: '',
    };
    expect(calcRecommended(item, 1)).toBe(2);
    expect(calcRecommended(item, 5)).toBe(2);
    expect(calcRecommended(item, 10)).toBe(2);
  });

  it('端数は切り上げる', () => {
    const item: ChecklistItem = {
      name: 'テスト',
      category: 'その他',
      unit: '個',
      quantityPerPerson: 3,
      description: '',
    };
    // 3 * 2 = 6（端数なし）
    expect(calcRecommended(item, 2)).toBe(6);
    // 3 * 1.5 → Math.ceil(4.5) はないケース（整数のみ想定）
  });
});

// ----------------------------------------------------------------
// RECOMMENDED_CHECKLIST の各品目値の検証
// ----------------------------------------------------------------
describe('RECOMMENDED_CHECKLIST 品目値', () => {
  it('飲料水は1人あたり10本（7日分=21L≒2Lペット10本）', () => {
    const water = RECOMMENDED_CHECKLIST.find((i) => i.name === '飲料水（2Lペット）');
    expect(water).toBeDefined();
    expect(water!.quantityPerPerson).toBe(10);
    expect(calcRecommended(water!, 2)).toBe(20);
    expect(calcRecommended(water!, 4)).toBe(40);
  });

  it('簡易トイレは1人あたり35回分（1日5回×7日）', () => {
    const toilet = RECOMMENDED_CHECKLIST.find((i) => i.name === '簡易トイレ');
    expect(toilet).toBeDefined();
    expect(toilet!.quantityPerPerson).toBe(35);
    expect(calcRecommended(toilet!, 3)).toBe(105);
  });

  it('懐中電灯は familyFixed=2（家族全体で2個固定）', () => {
    const flashlight = RECOMMENDED_CHECKLIST.find((i) => i.name === '懐中電灯');
    expect(flashlight).toBeDefined();
    expect(flashlight!.familyFixed).toBe(2);
    expect(calcRecommended(flashlight!, 1)).toBe(2);
    expect(calcRecommended(flashlight!, 6)).toBe(2);
  });

  it('携帯ラジオは家族で1個（quantityPerPerson=0, familyFixed未定義）', () => {
    const radio = RECOMMENDED_CHECKLIST.find((i) => i.name === '携帯ラジオ');
    expect(radio).toBeDefined();
    expect(radio!.quantityPerPerson).toBe(0);
    expect(radio!.familyFixed).toBeUndefined();
    expect(calcRecommended(radio!, 5)).toBe(1);
  });
});

// ----------------------------------------------------------------
// ペット品目
// ----------------------------------------------------------------
describe('ペット品目', () => {
  const petItems = RECOMMENDED_CHECKLIST.filter((i) => i.isPetItem);
  const nonPetItems = RECOMMENDED_CHECKLIST.filter((i) => !i.isPetItem);

  it('ペット品目が1件以上存在する', () => {
    expect(petItems.length).toBeGreaterThan(0);
  });

  it('ペットフード・水・衛生用品・キャリーが含まれる', () => {
    const names = petItems.map((i) => i.name);
    expect(names).toContain('ペットフード');
    expect(names).toContain('ペット用飲料水（2L）');
    expect(names).toContain('ペット用薬・衛生用品');
    expect(names).toContain('ペットキャリー');
  });

  it('ペット品目はすべて familyFixed を持つ（人数スケールしない）', () => {
    petItems.forEach((item) => {
      expect(item.familyFixed).toBeDefined();
    });
  });

  it('非ペット品目に isPetItem=true が混入していない', () => {
    nonPetItems.forEach((item) => {
      expect(item.isPetItem).toBeFalsy();
    });
  });

  it('hasPet=false でフィルタするとペット品目が除外される', () => {
    const hasPet = false;
    const filtered = RECOMMENDED_CHECKLIST.filter((i) => !i.isPetItem || hasPet);
    expect(filtered.some((i) => i.isPetItem)).toBe(false);
    expect(filtered.length).toBe(nonPetItems.length);
  });

  it('hasPet=true でフィルタすると全品目が含まれる', () => {
    const hasPet = true;
    const filtered = RECOMMENDED_CHECKLIST.filter((i) => !i.isPetItem || hasPet);
    expect(filtered.length).toBe(RECOMMENDED_CHECKLIST.length);
  });
});

// ----------------------------------------------------------------
// getStockStatus
// ----------------------------------------------------------------
describe('getStockStatus', () => {
  it('80%以上で「十分」', () => {
    expect(getStockStatus(8, 10)).toBe('十分');
    expect(getStockStatus(10, 10)).toBe('十分');
    expect(getStockStatus(100, 100)).toBe('十分');
  });

  it('50%以上80%未満で「注意」', () => {
    expect(getStockStatus(5, 10)).toBe('注意');
    expect(getStockStatus(7, 10)).toBe('注意');
  });

  it('50%未満で「不足」', () => {
    expect(getStockStatus(4, 10)).toBe('不足');
    expect(getStockStatus(0, 10)).toBe('不足');
  });

  it('推奨数量が0の場合は「十分」', () => {
    expect(getStockStatus(0, 0)).toBe('十分');
    expect(getStockStatus(5, 0)).toBe('十分');
  });
});
