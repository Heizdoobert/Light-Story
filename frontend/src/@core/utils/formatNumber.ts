export function formatNumber(value: number | string, decimals: number = 0): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCurrency(value: number | string, currency: string = 'VND'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ₫';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
  }).format(num);
}

export function formatCompactNumber(value: number): string {
  if (value < 1000) return value.toString();
  if (value < 1000000) return (value / 1000).toFixed(1) + 'K';
  if (value < 1000000000) return (value / 1000000).toFixed(1) + 'M';
  return (value / 1000000000).toFixed(1) + 'B';
}
