import { FormatRelativeTimeOptions, FormatDateOptions, SupportedLocale } from './types';

function parseDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a timestamp into localized relative time (e.g. "vừa xong", "5 phút trước", "2 hours ago").
 */
export function formatRelativeTime(
  dateInput: Date | string | number | null | undefined,
  options: FormatRelativeTimeOptions = {},
): string {
  const date = parseDate(dateInput);
  if (!date) return '—';

  const locale = options.locale ?? 'vi';
  const now = options.now instanceof Date ? options.now.getTime() : (options.now ?? Date.now());
  const diffInSeconds = Math.round((date.getTime() - now) / 1000);
  const absDiff = Math.abs(diffInSeconds);

  // Immediate threshold (< 45 seconds)
  if (absDiff < 45) {
    const isVi = locale.toLowerCase().startsWith('vi');
    return isVi ? 'vừa xong' : 'just now';
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, {
      numeric: 'auto',
      style: options.style ?? 'long',
    });

    if (absDiff < 90) return rtf.format(Math.sign(diffInSeconds) * 1, 'minute');
    if (absDiff < 45 * 60) return rtf.format(Math.round(diffInSeconds / 60), 'minute');
    if (absDiff < 90 * 60) return rtf.format(Math.sign(diffInSeconds) * 1, 'hour');
    if (absDiff < 22 * 3600) return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
    if (absDiff < 36 * 3600) return rtf.format(Math.sign(diffInSeconds) * 1, 'day');
    if (absDiff < 25 * 86400) return rtf.format(Math.round(diffInSeconds / 86400), 'day');
    if (absDiff < 45 * 86400) return rtf.format(Math.sign(diffInSeconds) * 1, 'month');
    if (absDiff < 320 * 86400) return rtf.format(Math.round(diffInSeconds / (30 * 86400)), 'month');
    return rtf.format(Math.round(diffInSeconds / (365 * 86400)), 'year');
  } catch {
    const mins = Math.round(absDiff / 60);
    return diffInSeconds < 0 ? `${mins}m ago` : `in ${mins}m`;
  }
}

/**
 * Formats a calendar date according to locale preferences.
 */
export function formatDate(
  dateInput: Date | string | number | null | undefined,
  locale: SupportedLocale = 'vi',
  options?: FormatDateOptions,
): string {
  const date = parseDate(dateInput);
  if (!date) return '—';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  try {
    return new Intl.DateTimeFormat(locale, options ?? defaultOptions).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Formats a timestamp with both date and time.
 */
export function formatDateTime(
  dateInput: Date | string | number | null | undefined,
  locale: SupportedLocale = 'vi',
): string {
  const date = parseDate(dateInput);
  if (!date) return '—';

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
