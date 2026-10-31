import { describe, it, expect } from 'vitest';
import {
  formatCompactNumber,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatRelativeTime,
  formatDate,
  formatDateTime,
  formatBytes,
  slugify,
  formatChapterNumber,
  formatChapterTitle,
  truncate,
  formatters,
} from '../index';

describe('Formatters Core SDK', () => {
  describe('Numbers & Metrics Formatter', () => {
    it('formats compact view and follower counts', () => {
      expect(formatCompactNumber(0)).toBe('0');
      expect(formatCompactNumber(null)).toBe('0');
      expect(formatCompactNumber(undefined)).toBe('0');
      expect(formatCompactNumber(NaN)).toBe('0');

      // Small numbers
      expect(formatCompactNumber(450)).toBe('450');

      // Thousands (K)
      const formatted1500 = formatCompactNumber(1500, 'en');
      expect(formatted1500).toMatch(/^1\.5\s?K$/i);

      // Millions (M)
      const formattedMillions = formatCompactNumber(2400000, 'en');
      expect(formattedMillions).toMatch(/^2\.4\s?M$/i);
    });

    it('formats standard numbers with locale', () => {
      const enFormatted = formatNumber(1250000, 'en');
      expect(enFormatted).toBe('1,250,000');
    });

    it('formats currency values', () => {
      const vnd = formatCurrency(50000, 'VND', 'vi');
      expect(vnd).toContain('50.000');

      const usd = formatCurrency(25.5, 'USD', 'en');
      expect(usd).toContain('$25.50');
    });

    it('formats percentages', () => {
      expect(formatPercentage(0.75)).toBe('75%');
      expect(formatPercentage(0.856, 1, 'en')).toBe('85.6%');
      expect(formatPercentage(0.856, 1, 'vi')).toBe('85,6%');
      expect(formatPercentage(null)).toBe('0%');
    });
  });

  describe('Dates & Relative Time Formatter', () => {
    const fixedNow = new Date('2026-10-23T12:00:00Z');

    it('formats recent timestamps as immediate labels', () => {
      const tenSecsAgo = new Date(fixedNow.getTime() - 10 * 1000);

      expect(formatRelativeTime(tenSecsAgo, { now: fixedNow, locale: 'vi' })).toBe('vừa xong');
      expect(formatRelativeTime(tenSecsAgo, { now: fixedNow, locale: 'en' })).toBe('just now');
    });

    it('formats past intervals relative to now', () => {
      const fiveMinsAgo = new Date(fixedNow.getTime() - 5 * 60 * 1000);
      const resViMins = formatRelativeTime(fiveMinsAgo, { now: fixedNow, locale: 'vi' });
      expect(resViMins).toContain('phút trước');

      const resEnMins = formatRelativeTime(fiveMinsAgo, { now: fixedNow, locale: 'en' });
      expect(resEnMins).toBe('5 minutes ago');

      const twoHoursAgo = new Date(fixedNow.getTime() - 2 * 3600 * 1000);
      const resViHours = formatRelativeTime(twoHoursAgo, { now: fixedNow, locale: 'vi' });
      expect(resViHours).toContain('giờ trước');

      const resEnHours = formatRelativeTime(twoHoursAgo, { now: fixedNow, locale: 'en' });
      expect(resEnHours).toBe('2 hours ago');
    });

    it('gracefully handles invalid and empty dates', () => {
      expect(formatRelativeTime(null)).toBe('—');
      expect(formatRelativeTime('invalid-date-string')).toBe('—');
      expect(formatDate(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
    });

    it('formats calendar dates', () => {
      const date = new Date('2026-10-23T00:00:00Z');
      const formattedEn = formatDate(date, 'en');
      expect(formattedEn).toContain('2026');
      expect(formattedEn).toContain('Oct');
    });
  });

  describe('Byte & File Size Formatter', () => {
    it('formats bytes into clean human units', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-100)).toBe('0 B');
      expect(formatBytes(null)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB');
      expect(formatBytes(1.25 * 1024 * 1024 * 1024)).toBe('1.3 GB');
    });
  });

  describe('Text, Chapters & Slugs Formatter', () => {
    it('converts titles with Vietnamese diacritics into URL-safe slugs', () => {
      const title = 'Đấu La Đại Lục: Khởi Đầu Mới & Trở Lại!';
      const slug = slugify(title);
      expect(slug).toBe('dau-la-dai-luc-khoi-dau-moi-tro-lai');
    });

    it('handles empty and null slugs gracefully', () => {
      expect(slugify(null)).toBe('');
      expect(slugify('   ')).toBe('');
    });

    it('formats chapter numbers with locale and custom prefixes', () => {
      expect(formatChapterNumber(12, { locale: 'vi' })).toBe('Chương 12');
      expect(formatChapterNumber(12.5, { locale: 'en' })).toBe('Ch. 12.5');
      expect(formatChapterNumber(5, { prefix: 'Episode' })).toBe('Episode 5');
      expect(formatChapterNumber(null)).toBe('');
    });

    it('formats full chapter headings with titles', () => {
      expect(formatChapterTitle(10, 'Quyết Chiến', { locale: 'vi' })).toBe('Chương 10: Quyết Chiến');
      expect(formatChapterTitle(10, '', { locale: 'vi' })).toBe('Chương 10');
      expect(formatChapterTitle('', 'Quyết Chiến')).toBe('Quyết Chiến');
    });

    it('truncates text with options', () => {
      const text = 'Nàng tiên cá và hoàng tử sống hạnh phúc mãi mãi.';
      expect(truncate(text, 15)).toBe('Nàng tiên cá...');
      expect(truncate(text, 15, { preserveWords: true })).toBe('Nàng tiên...');
      expect(truncate('Short', 50)).toBe('Short');
      expect(truncate(null, 10)).toBe('');
    });
  });

  describe('Namespace Object Export', () => {
    it('exposes all formatters through formatters namespace', () => {
      expect(formatters.formatCompactNumber).toBeDefined();
      expect(formatters.formatRelativeTime).toBeDefined();
      expect(formatters.formatBytes).toBeDefined();
      expect(formatters.slugify).toBeDefined();
    });
  });
});
