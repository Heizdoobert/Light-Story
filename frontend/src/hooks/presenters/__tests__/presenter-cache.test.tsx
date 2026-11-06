import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QUERY_KEYS, DEFAULT_CACHE_CONFIG } from '@/lib/constants/query-keys';
import { useHomePagePresenter } from '../useHomePagePresenter';
import { useComicDetailPresenter } from '../useComicDetailPresenter';
import * as storyService from '@/services/comics/story.service';
import * as chapterService from '@/services/comics/chapter.service';
import * as readerHubService from '@/services/reader/readerHub.service';
import { apiClient } from '@/lib/api/apiClient';
import type { ComicContext as Comic } from '@/services/comics/comic.service';
import type { Chapter, Story } from '@/types/entities';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useParams: () => ({ comicId: 'comic-test-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'vi' }),
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStoriesPage: vi.fn(),
  fetchStoryById: vi.fn(),
}));

vi.mock('@/services/comics/chapter.service', () => ({
  fetchChaptersByStoryId: vi.fn(),
}));

vi.mock('@/services/reader/readerHub.service', () => ({
  getReadingHistory: vi.fn(),
}));

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockComic: Comic = {
  id: 'comic-test-1',
  storyId: 'comic-test-1',
  tenantKey: 'default',
  slug: 'comic-test-1',
  title: 'Test Comic 1',
  description: 'Test description',
  author: 'Author A',
  status: 'ongoing',
  category: ['Action', 'Adventure'],
  tags: 'Hot, New',
  viewCount: 1500,
  coverUrl: 'https://images.example.com/cover1.jpg',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const mockChapter1: Chapter = {
  id: 'ch-1',
  story_id: 'comic-test-1',
  chapter_number: 1,
  title: 'Chapter 1',
  created_at: '2026-01-01T00:00:00Z',
} as Chapter;

const mockChapter2: Chapter = {
  id: 'ch-2',
  story_id: 'comic-test-1',
  chapter_number: 2,
  title: 'Chapter 2',
  created_at: '2026-01-02T00:00:00Z',
} as Chapter;

describe('QUERY_KEYS factory & DEFAULT_CACHE_CONFIG', () => {
  it('defines structured query keys accurately', () => {
    expect(QUERY_KEYS.stories.all).toEqual(['stories']);
    expect(QUERY_KEYS.stories.list({ page: 1, pageSize: 15, sort: 'newest' })).toEqual([
      'stories',
      'list',
      { page: 1, pageSize: 15, sort: 'newest' },
    ]);
    expect(QUERY_KEYS.stories.detail('comic-123')).toEqual(['stories', 'detail', 'comic-123']);
    expect(QUERY_KEYS.stories.trending).toEqual(['stories', 'trending']);

    expect(QUERY_KEYS.categories.all).toEqual(['categories']);

    expect(QUERY_KEYS.chapters.byStory('comic-123')).toEqual(['chapters', 'byStory', 'comic-123']);
    expect(QUERY_KEYS.chapters.batch('comic-1,comic-2')).toEqual(['chapters', 'batch', 'comic-1,comic-2']);

    expect(QUERY_KEYS.bookmarks.all).toEqual(['bookmarks']);
    expect(QUERY_KEYS.history.all).toEqual(['history']);
  });

  it('defines DEFAULT_CACHE_CONFIG with correct timings and focus refetch settings', () => {
    expect(DEFAULT_CACHE_CONFIG.staleTime).toBe(60_000);
    expect(DEFAULT_CACHE_CONFIG.gcTime).toBe(300_000);
    expect(DEFAULT_CACHE_CONFIG.refetchOnWindowFocus).toBe(false);
  });
});

describe('useHomePagePresenter caching & runtime behavior', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const QueryWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    QueryWrapper.displayName = 'QueryWrapper';
    return QueryWrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(apiClient.get).mockResolvedValue([]);
    vi.mocked(storyService.fetchStoriesPage).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(readerHubService.getReadingHistory).mockResolvedValue([]);
  });

  it('serves initialData immediately with correct flags without network errors', () => {
    const { result } = renderHook(
      () =>
        useHomePagePresenter(
          [mockComic],
          [mockComic],
          { 'comic-test-1': mockChapter2 },
          true,
        ),
      { wrapper: createWrapper() },
    );

    expect(result.current.comics).toEqual([mockComic]);
    expect(result.current.trendingComics).toEqual([mockComic]);
    expect(result.current.latestChapters).toEqual({ 'comic-test-1': mockChapter2 });
    expect(result.current.trendingLoaded).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.getComicCover).toBe('function');
    expect(typeof result.current.applyComicCoverFallback).toBe('function');
  });

  it('retrieves data from pre-populated TanStack Query cache without calling services', async () => {
    const listKey = QUERY_KEYS.stories.list({ page: 1, pageSize: 15, sort: 'newest' });
    queryClient.setQueryData(listKey, [mockComic]);
    queryClient.setQueryData(QUERY_KEYS.stories.trending, [mockComic]);

    const { result } = renderHook(() => useHomePagePresenter([], [], {}, false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.comics).toEqual([mockComic]);
    });

    expect(result.current.trendingComics).toEqual([mockComic]);
    // fetchStoriesPage should not be invoked because queries have fresh cached data
    expect(storyService.fetchStoriesPage).not.toHaveBeenCalled();
  });

  it('fetches and populates cache when unhydrated and initial data is empty', async () => {
    vi.mocked(storyService.fetchStoriesPage).mockImplementation(async ({ sort }) => {
      if (sort === 'most_viewed') {
        return { items: [mockComic] as unknown as Story[], total: 1 };
      }
      return { items: [mockComic] as unknown as Story[], total: 1 };
    });

    const { result } = renderHook(() => useHomePagePresenter([], [], {}, false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.comics.length).toBe(1);
    });

    expect(result.current.trendingComics.length).toBe(1);

    // Verify cache in TanStack Query
    const listKey = QUERY_KEYS.stories.list({ page: 1, pageSize: 15, sort: 'newest' });
    const cachedList = queryClient.getQueryData(listKey);
    expect(cachedList).toEqual([mockComic]);

    const cachedTrending = queryClient.getQueryData(QUERY_KEYS.stories.trending);
    expect(cachedTrending).toEqual([mockComic]);
  });
});

describe('useComicDetailPresenter caching & runtime behavior', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const DetailQueryWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    DetailQueryWrapper.displayName = 'DetailQueryWrapper';
    return DetailQueryWrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(apiClient.get).mockResolvedValue([]);
    vi.mocked(storyService.fetchStoryById).mockResolvedValue(mockComic as unknown as Story);
    vi.mocked(chapterService.fetchChaptersByStoryId).mockResolvedValue([mockChapter1, mockChapter2]);
    vi.mocked(readerHubService.getReadingHistory).mockResolvedValue([]);
  });

  it('serves initialData and computes derived fields without runtime errors', () => {
    const { result } = renderHook(
      () =>
        useComicDetailPresenter({
          initialComic: mockComic,
          initialChapters: [mockChapter1, mockChapter2],
          hydrated: true,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.comicId).toBe('comic-test-1');
    expect(result.current.comic).toEqual(mockComic);
    expect(result.current.chapters).toEqual([mockChapter1, mockChapter2]);
    expect(result.current.firstChapter).toEqual(mockChapter1);
    expect(result.current.latestChapter).toEqual(mockChapter2);
    expect(result.current.categoryArray).toEqual(['Action', 'Adventure']);
    expect(result.current.tagArray).toEqual(['Hot', 'New']);
    expect(result.current.loading).toBe(false);
  });

  it('retrieves comic detail and chapters from pre-populated TanStack cache without refetching', async () => {
    queryClient.setQueryData(QUERY_KEYS.stories.detail('comic-test-1'), mockComic);
    queryClient.setQueryData(QUERY_KEYS.chapters.byStory('comic-test-1'), [mockChapter1, mockChapter2]);

    const { result } = renderHook(() => useComicDetailPresenter(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.comic).toEqual(mockComic);
      expect(result.current.chapters).toEqual([mockChapter1, mockChapter2]);
    });

    expect(storyService.fetchStoryById).not.toHaveBeenCalled();
    expect(chapterService.fetchChaptersByStoryId).not.toHaveBeenCalled();
  });

  it('fetches story detail and chapters via services and populates cache', async () => {
    const { result } = renderHook(() => useComicDetailPresenter(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.comic).toEqual(mockComic);
      expect(result.current.chapters.length).toBe(2);
    });

    expect(storyService.fetchStoryById).toHaveBeenCalledWith('comic-test-1');
    expect(chapterService.fetchChaptersByStoryId).toHaveBeenCalledWith('comic-test-1');

    // Verify cache state
    const cachedStory = queryClient.getQueryData(QUERY_KEYS.stories.detail('comic-test-1'));
    expect(cachedStory).toEqual(mockComic);

    const cachedChapters = queryClient.getQueryData(QUERY_KEYS.chapters.byStory('comic-test-1'));
    expect(cachedChapters).toEqual([mockChapter1, mockChapter2]);
  });
});
