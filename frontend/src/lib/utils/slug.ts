import { slugify } from '@/sdk';

/**
 * Normalizes title/genre names into URL-safe slugs.
 * Delegates to canonical slugify from @light-story/sdk.
 */
export function normalizeName(value: string): string {
  return slugify(value);
}

export { slugify };
