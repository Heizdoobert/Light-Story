import { FormatChapterOptions, TruncateOptions } from './types';

/**
 * Normalizes Vietnamese diacritics and special characters into clean ASCII.
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));
}

/**
 * Converts a title, story name, or phrase into a clean URL-safe slug.
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return '';

  const withoutAccents = removeVietnameseAccents(text.trim());
  return withoutAccents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')     // remove non-alphanumeric characters
    .replace(/\s+/g, '-')             // convert whitespace to hyphen
    .replace(/-+/g, '-')              // collapse duplicate hyphens
    .replace(/^-+|-+$/g, '');         // trim boundary hyphens
}

/**
 * Standardizes chapter numbering across Vietnamese and English locales.
 * e.g. "Chương 12" / "Ch. 12" / "Chương 12.5"
 */
export function formatChapterNumber(
  num: number | string | null | undefined,
  options: FormatChapterOptions = {},
): string {
  if (num === null || num === undefined || num === '') {
    return '';
  }

  const locale = options.locale ?? 'vi';
  const isVi = locale.toLowerCase().startsWith('vi');
  const defaultPrefix = isVi ? 'Chương' : 'Ch.';
  const prefix = options.prefix ?? defaultPrefix;

  return `${prefix} ${num}`.trim();
}

/**
 * Formats full chapter heading with optional chapter title.
 * e.g. "Chương 15: Khởi Đầu" or "Ch. 15: The Beginning"
 */
export function formatChapterTitle(
  chapterNumber: number | string,
  title?: string | null,
  options: FormatChapterOptions = {},
): string {
  const chapterPrefix = formatChapterNumber(chapterNumber, options);
  const cleanTitle = title?.trim();

  if (!cleanTitle) {
    return chapterPrefix;
  }
  if (!chapterPrefix) {
    return cleanTitle;
  }

  // Avoid repetitive "Chương 12: Chương 12" if title already contains the chapter prefix
  const lowerTitle = cleanTitle.toLowerCase();
  const lowerPrefix = chapterPrefix.toLowerCase();
  if (
    lowerTitle === lowerPrefix ||
    lowerTitle === `chương ${chapterNumber}`.toLowerCase() ||
    lowerTitle === `ch. ${chapterNumber}`.toLowerCase()
  ) {
    return chapterPrefix;
  }

  return `${chapterPrefix}: ${cleanTitle}`;
}

/**
 * Truncates long descriptions or snippets with an ellipsis.
 */
export function truncate(
  text: string | null | undefined,
  maxLength: number,
  options: TruncateOptions = {},
): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  const suffix = options.suffix ?? '...';
  const targetLength = Math.max(0, maxLength - suffix.length);

  if (options.preserveWords) {
    const truncated = text.slice(0, targetLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > targetLength * 0.5) {
      return truncated.slice(0, lastSpace) + suffix;
    }
  }

  return text.slice(0, targetLength) + suffix;
}
