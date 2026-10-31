export type SupportedLocale = 'vi' | 'en' | string;

export interface FormatRelativeTimeOptions {
  /** Relative comparison reference point (defaults to Date.now()) */
  now?: Date | number;
  /** Display language locale (defaults to 'vi') */
  locale?: SupportedLocale;
  /** Length style for relative labels */
  style?: 'long' | 'short' | 'narrow';
}

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  /** Display language locale (defaults to 'vi') */
  locale?: SupportedLocale;
}

export interface FormatChapterOptions {
  /** Target language locale */
  locale?: SupportedLocale;
  /** Custom prefix (overrides default 'Chương' / 'Ch.') */
  prefix?: string;
}

export interface TruncateOptions {
  /** Truncation suffix (defaults to '...') */
  suffix?: string;
  /** Keep whole words if true */
  preserveWords?: boolean;
}
