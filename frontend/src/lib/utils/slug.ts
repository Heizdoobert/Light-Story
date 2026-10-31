import { loadComponent } from '@light-story/dynamic-sdk';

/**
 * Normalizes title/genre names into URL-safe slugs.
 * Dynamically loads the `slugify` utility from the SDK.
 */
export async function normalizeName(value: string): Promise<string> {
  const slugify = (await loadComponent('slugify')) as (s: string) => string;
  return slugify(value);
}

// Preserve previous named export for compatibility.
export { normalizeName as slugify };
