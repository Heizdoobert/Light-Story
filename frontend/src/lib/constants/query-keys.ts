/**
 * TanStack Query Keys Factory
 * Centralized query keys to avoid magic strings and ensure consistent cache invalidation.
 */

export const QUERY_KEYS = {
  stories: {
    all: ['stories'] as const,
    list: (params?: unknown) => ['stories', 'list', params] as const,
    detail: (id: string | number) => ['stories', 'detail', id] as const,
    trending: ['stories', 'trending'] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  chapters: {
    byStory: (storyId: string | number) => ['chapters', 'byStory', storyId] as const,
    batch: (comicIds: string | string[]) => ['chapters', 'batch', comicIds] as const,
  },
  bookmarks: {
    all: ['bookmarks'] as const,
  },
  history: {
    all: ['history'] as const,
  },
} as const;

/**
 * Default cache configuration for queries
 */
export const DEFAULT_CACHE_CONFIG = {
  staleTime: 60_000,
  gcTime: 300_000,
  refetchOnWindowFocus: false,
} as const;
