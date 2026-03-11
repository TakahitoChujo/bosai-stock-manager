export function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = expiry.getTime() - today.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getStockStatus(quantity: number, recommended: number): '十分' | '注意' | '不足' {
  if (recommended === 0) return '十分';
  const ratio = quantity / recommended;
  if (ratio >= 0.8) return '十分';
  if (ratio >= 0.5) return '注意';
  return '不足';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDaysLeft(days: number): string {
  if (days < 0) return '期限切れ';
  if (days === 0) return '今日まで';
  if (days < 30) return `あと${days}日`;
  if (days < 365) return `あと約${Math.floor(days / 30)}ヶ月`;
  return `あと約${Math.floor(days / 365)}年`;
}

export function buildAmazonSearchUrl(query: string): string {
  const url = new URL('https://www.amazon.co.jp/s');
  url.searchParams.set('k', query);
  url.searchParams.set('tag', 'bosai-stock-22');
  return url.toString();
}

export function buildRakutenSearchUrl(query: string): string {
  const url = new URL('https://search.rakuten.co.jp');
  url.pathname = `/search/mall/${encodeURIComponent(query)}/`;
  return url.toString();
}
