import { SupportedLocale } from './types';

/**
 * Formats large view counts and numeric metrics into compact human-readable notation (e.g. 1.2K, 3.4M).
 */
export function formatCompactNumber(
  value: number | string | null | undefined,
  locale: SupportedLocale = 'vi',
): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return '0';
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    });
    return formatter.format(num);
  } catch {
    // Fallback if environment lacks compact notation
    if (Math.abs(num) >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (Math.abs(num) >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (Math.abs(num) >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return String(num);
  }
}

/**
 * Formats a number with standard thousands separators according to locale.
 */
export function formatNumber(
  value: number | string | null | undefined,
  locale: SupportedLocale = 'vi',
  options?: Intl.NumberFormatOptions,
): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale, options).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Formats currency values (e.g. 50,000 ₫ or $50.00).
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'VND',
  locale: SupportedLocale = 'vi',
): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(num);
  } catch {
    return `${num} ${currency}`;
  }
}

/**
 * Formats a ratio/number as a percentage (e.g. 0.85 -> 85%).
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 1,
  locale: SupportedLocale = 'vi',
): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return '0%';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return `${(num * 100).toFixed(decimals)}%`;
  }
}
