// Number formatters for admin dashboard cards, delegating to the unified SDK formatters.
import { formatCompactNumber as sdkFormatCompact, formatNumber as sdkFormatNumber } from '@/sdk';

export function formatCompactNumber(value: number): string {
  return sdkFormatCompact(value, 'en-US');
}

export function formatFixedNumber(value: number, digits = 2): string {
  return sdkFormatNumber(value, 'en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
