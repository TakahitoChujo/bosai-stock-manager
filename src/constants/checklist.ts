import { ChecklistItem } from '../types';

// 内閣府・消防庁推奨の備蓄品リスト（7日分基準）
export const RECOMMENDED_CHECKLIST: ChecklistItem[] = [
  // 水
  {
    name: '飲料水（2Lペット）',
    category: '水',
    unit: '本',
    quantityPerPerson: 10, // 1人1日3L × 7日分 = 21L ≒ 2Lペット10本
    description: '1人1日3L、7日分を目安に',
  },
  // 食料
  {
    name: 'アルファ米',
    category: '食料',
    unit: '食',
    quantityPerPerson: 7,
    description: '1人1日1食を7日分',
  },
  {
    name: '缶詰（魚・肉類）',
    category: '食料',
    unit: '缶',
    quantityPerPerson: 7,
    description: '1人1日1缶を7日分',
  },
  {
    name: 'インスタント食品',
    category: '食料',
    unit: '個',
    quantityPerPerson: 7,
    description: 'カップ麺・インスタント麺等',
  },
  {
    name: '乾パン・クラッカー',
    category: '食料',
    unit: '袋',
    quantityPerPerson: 3,
    description: '非常食として備蓄',
  },
  // 電池・電源
  {
    name: '単1電池',
    category: '電池',
    unit: '本',
    quantityPerPerson: 2,
    description: 'ラジオ・懐中電灯用',
  },
  {
    name: '単3電池',
    category: '電池',
    unit: '本',
    quantityPerPerson: 4,
    description: '各種機器用',
  },
  {
    name: 'モバイルバッテリー',
    category: '電池',
    unit: '個',
    quantityPerPerson: 1,
    description: 'スマホ充電用（10000mAh以上推奨）',
  },
  {
    name: 'カセットガスボンベ',
    category: 'その他',
    unit: '本',
    quantityPerPerson: 3,
    description: 'カセットコンロ用、1人3本目安',
  },
  // 薬・衛生
  {
    name: '常備薬',
    category: '薬・衛生',
    unit: 'セット',
    quantityPerPerson: 1,
    description: '風邪薬・胃腸薬・痛み止め等',
  },
  {
    name: 'マスク',
    category: '薬・衛生',
    unit: '枚',
    quantityPerPerson: 7,
    description: '1人7日分',
  },
  {
    name: '消毒液（アルコール）',
    category: '薬・衛生',
    unit: '本',
    quantityPerPerson: 1,
    description: '100ml以上',
  },
  {
    name: 'トイレットペーパー',
    category: '薬・衛生',
    unit: 'ロール',
    quantityPerPerson: 3,
    description: '1人3ロールを目安に',
  },
  {
    name: '簡易トイレ',
    category: '薬・衛生',
    unit: '回分',
    quantityPerPerson: 35, // 1人1日5回 × 7日分
    description: '断水時に備えて（1人1日5回×7日分）',
  },
  // その他
  {
    name: '懐中電灯',
    category: 'その他',
    unit: '個',
    quantityPerPerson: 0,
    familyFixed: 2, // 家族全体で2個
    description: '家族全体で2個、予備電池とセットで',
  },
  {
    name: '携帯ラジオ',
    category: 'その他',
    unit: '個',
    quantityPerPerson: 0, // 1家族1個
    description: '手回し・ソーラー充電式推奨',
  },
  // ペット用品目
  {
    name: 'ペットフード',
    category: 'その他',
    unit: '日分',
    quantityPerPerson: 0,
    familyFixed: 7,
    isPetItem: true,
    description: '7日分を備蓄（普段食べているフードを多めにストック）',
  },
  {
    name: 'ペット用飲料水（2L）',
    category: '水',
    unit: '本',
    quantityPerPerson: 0,
    familyFixed: 7,
    isPetItem: true,
    description: '7日分（体重10kgで約700ml/日が目安）',
  },
  {
    name: 'ペット用薬・衛生用品',
    category: '薬・衛生',
    unit: 'セット',
    quantityPerPerson: 0,
    familyFixed: 1,
    isPetItem: true,
    description: '常備薬・ウェットティッシュ・消臭袋等',
  },
  {
    name: 'ペットキャリー',
    category: 'その他',
    unit: '個',
    quantityPerPerson: 0,
    familyFixed: 1,
    isPetItem: true,
    description: '避難時の移動・同行避難に必須',
  },
];

export const CATEGORY_ICONS: Record<string, string> = {
  '水': '💧',
  '食料': '🍱',
  '電池': '🔋',
  '薬・衛生': '💊',
  'その他': '🔦',
};

export const CATEGORIES = ['水', '食料', '電池', '薬・衛生', 'その他'] as const;

// 家族人数に応じた推奨数量計算
export function calcRecommended(item: ChecklistItem, memberCount: number): number {
  if (item.familyFixed !== undefined) return item.familyFixed;
  if (item.quantityPerPerson === 0) return 1;
  return Math.ceil(item.quantityPerPerson * memberCount);
}
