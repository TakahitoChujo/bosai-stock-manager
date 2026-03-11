export const Colors = {
  primary: '#E8530A',
  safe: '#2E7D32',
  warning: '#F57C00',
  danger: '#C62828',
  background: '#F5F5F0',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  subText: '#757575',
  border: '#E0E0E0',
  disabled: '#BDBDBD',
  safeLight: '#E8F5E9',
  warningLight: '#FFF3E0',
  dangerLight: '#FFEBEE',
  primaryLight: '#FBE9E7',
} as const;

export const CategoryColors: Record<string, string> = {
  '水': '#1565C0',
  '食料': '#2E7D32',
  '電池': '#F57F17',
  '薬・衛生': '#6A1B9A',
  'その他': '#37474F',
};

export const StatusColors = {
  '十分': Colors.safe,
  '注意': Colors.warning,
  '不足': Colors.danger,
  '未登録': Colors.disabled,
} as const;
