import {
  getDaysUntilExpiry,
  formatDate,
  formatDaysLeft,
  buildAmazonSearchUrl,
  buildRakutenSearchUrl,
} from '../src/utils/helpers';

// ----------------------------------------------------------------
// getDaysUntilExpiry
// ----------------------------------------------------------------
describe('getDaysUntilExpiry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-02T00:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('未来の日付は正の日数を返す', () => {
    expect(getDaysUntilExpiry('2026-03-12')).toBe(10);
  });

  it('当日は0を返す', () => {
    expect(getDaysUntilExpiry('2026-03-02')).toBe(0);
  });

  it('翌日は1を返す', () => {
    expect(getDaysUntilExpiry('2026-03-03')).toBe(1);
  });

  it('昨日は-1を返す', () => {
    expect(getDaysUntilExpiry('2026-03-01')).toBe(-1);
  });

  it('1年後は365を返す', () => {
    expect(getDaysUntilExpiry('2027-03-02')).toBe(365);
  });

  it('遠い未来は大きな正の値を返す', () => {
    expect(getDaysUntilExpiry('2099-12-31')).toBeGreaterThan(0);
  });
});

// ----------------------------------------------------------------
// formatDate
// ----------------------------------------------------------------
describe('formatDate', () => {
  it('ISO日付をYYYY/MM/DD形式に変換する', () => {
    // 正午指定でタイムゾーンによる日付ずれを防ぐ
    expect(formatDate('2026-06-15T12:00:00')).toBe('2026/06/15');
  });

  it('月と日をゼロパディングする', () => {
    expect(formatDate('2026-01-05T12:00:00')).toBe('2026/01/05');
    expect(formatDate('2026-12-09T12:00:00')).toBe('2026/12/09');
  });

  it('YYYY/MM/DD の形式になっている', () => {
    const result = formatDate('2026-03-02T12:00:00');
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });
});

// ----------------------------------------------------------------
// formatDaysLeft
// ----------------------------------------------------------------
describe('formatDaysLeft', () => {
  it('負の値は「期限切れ」を返す', () => {
    expect(formatDaysLeft(-1)).toBe('期限切れ');
    expect(formatDaysLeft(-100)).toBe('期限切れ');
  });

  it('0は「今日まで」を返す', () => {
    expect(formatDaysLeft(0)).toBe('今日まで');
  });

  it('1〜29日は「あとN日」を返す', () => {
    expect(formatDaysLeft(1)).toBe('あと1日');
    expect(formatDaysLeft(14)).toBe('あと14日');
    expect(formatDaysLeft(29)).toBe('あと29日');
  });

  it('30〜364日は「あと約Nヶ月」を返す', () => {
    expect(formatDaysLeft(30)).toBe('あと約1ヶ月');
    expect(formatDaysLeft(60)).toBe('あと約2ヶ月');
    expect(formatDaysLeft(364)).toBe('あと約12ヶ月');
  });

  it('365日以上は「あと約N年」を返す', () => {
    expect(formatDaysLeft(365)).toBe('あと約1年');
    expect(formatDaysLeft(730)).toBe('あと約2年');
    expect(formatDaysLeft(1095)).toBe('あと約3年');
  });
});

// ----------------------------------------------------------------
// buildAmazonSearchUrl
// ----------------------------------------------------------------
describe('buildAmazonSearchUrl', () => {
  it('amazon.co.jp のURLを生成する', () => {
    const url = buildAmazonSearchUrl('飲料水');
    expect(url).toContain('amazon.co.jp');
  });

  it('アフィリエイトタグが付与される', () => {
    const url = buildAmazonSearchUrl('飲料水');
    expect(url).toContain('tag=bosai-stock-22');
  });

  it('検索クエリが含まれる', () => {
    const url = buildAmazonSearchUrl('非常食');
    expect(url).toContain('%E9%9D%9E%E5%B8%B8%E9%A3%9F'); // 非常食 のURLエンコード
  });

  it('スペースをURLエンコードする', () => {
    const url = buildAmazonSearchUrl('水 2L');
    expect(url).not.toContain(' ');
  });

  it('空クエリでも有効なURLを生成する', () => {
    const url = buildAmazonSearchUrl('');
    expect(url).toContain('amazon.co.jp');
    expect(url).toContain('tag=bosai-stock-22');
  });
});

// ----------------------------------------------------------------
// buildRakutenSearchUrl
// ----------------------------------------------------------------
describe('buildRakutenSearchUrl', () => {
  it('search.rakuten.co.jp のURLを生成する', () => {
    const url = buildRakutenSearchUrl('非常食');
    expect(url).toContain('search.rakuten.co.jp');
  });

  it('検索クエリがパスに含まれる', () => {
    const url = buildRakutenSearchUrl('非常食');
    expect(url).toContain('%E9%9D%9E%E5%B8%B8%E9%A3%9F');
  });

  it('スペースをURLエンコードする', () => {
    const url = buildRakutenSearchUrl('水 2L');
    expect(url).not.toContain(' ');
  });
});
