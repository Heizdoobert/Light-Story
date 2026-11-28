import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime } from '../formatters/dates';
import {
  formatCompactNumber,
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '../formatters/numbers';

const boom = (): never => {
  throw new Error('unavailable');
};

afterEach(() => vi.restoreAllMocks());

describe('date formatter fallbacks', () => {
  it('uses every relative-time threshold with an explicit locale and now value', () => {
    const now = new Date(0);
    const cases: Array<[number, number]> = [
      [60, 0],
      [120, Number(now)],
      [23 * 3600, 0],
      [40 * 3600, 0],
      [26 * 86400, 0],
      [50 * 86400, 0],
      [400 * 86400, 0],
    ];
    for (const [seconds, reference] of cases) {
      const out = formatRelativeTime(seconds * 1000, {
        locale: 'en',
        now: reference === 0 ? now : reference,
      });
      expect(out).not.toBe('—');
      expect(out).not.toContain('NaN');
    }
  });

  it('falls back to plain minutes when RelativeTimeFormat is unavailable', () => {
    vi.spyOn(Intl, 'RelativeTimeFormat').mockImplementation(boom);
    expect(formatRelativeTime(120000, { now: 0, locale: 'en' })).toBe('in 2m');
    expect(formatRelativeTime(-120000, { now: 0, locale: 'en' })).toBe('2m ago');
  });

  it('falls back to ISO and locale string when DateTimeFormat is unavailable', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(boom);
    expect(formatDate(0, 'en')).toBe('1970-01-01');
    expect(formatDateTime(0, 'en')).toContain('1970');
  });
});

describe('number formatter fallbacks', () => {
  it('accepts numeric strings and rejects invalid values', () => {
    expect(formatCompactNumber('1500', 'en')).toMatch(/^1\.5\s?K$/i);
    expect(formatNumber('1250000', 'en')).toBe('1,250,000');
    expect(formatNumber(undefined)).toBe('0');
    expect(formatCurrency('50', 'USD', 'en')).toContain('$50');
    expect(formatCurrency(NaN)).toBe('0');
    expect(formatPercentage('0.75', 1, 'en')).toBe('75%');
  });

  it('uses manual compact notation when NumberFormat is unavailable', () => {
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(boom);
    expect(formatCompactNumber(1_200_000_000)).toBe('1.2B');
    expect(formatCompactNumber(2_000_000)).toBe('2M');
    expect(formatCompactNumber(3_000)).toBe('3K');
    expect(formatCompactNumber(42)).toBe('42');
    expect(formatNumber(1234)).toBe('1234');
    expect(formatCurrency(50, 'USD')).toBe('50 USD');
    expect(formatPercentage(0.75, 1)).toBe('75.0%');
  });
});
