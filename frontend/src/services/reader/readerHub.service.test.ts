import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockApiClient = { get: vi.fn().mockResolvedValue(undefined), post: vi.fn().mockResolvedValue(undefined) };
vi.mock('@/lib/api/apiClient', () => ({ apiClient: mockApiClient }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('readerHub - LocalStorage Fallback (API unavailable)', () => {
  it('toggles bookmark in localStorage when guest', async () => {
    const { toggleBookmark, getBookmarks } = await import('./readerHub.service');
    const isBookmarked = await toggleBookmark('comic-101');
    expect(isBookmarked).toBe(true);

    const list = await getBookmarks();
    expect(list).toContain('comic-101');

    const toggledOff = await toggleBookmark('comic-101');
    expect(toggledOff).toBe(false);
  });

  it('records reading history in localStorage when guest', async () => {
    const { recordReadingHistory, getReadingHistory } = await import('./readerHub.service');
    await recordReadingHistory('comic-101', 'chap-5', 5);
    const history = await getReadingHistory();
    expect(history).toHaveLength(1);
    expect(history[0].comicId).toBe('comic-101');
    expect(history[0].chapterNumber).toBe(5);
  });
});

describe('readerHub - API path', () => {
  it('getBookmarks returns API data when available', async () => {
    mockApiClient.get.mockResolvedValue([{ comicId: 'c1' }, { comicId: 'c2' }]);
    const { getBookmarks } = await import('./readerHub.service');
    const result = await getBookmarks();
    expect(result).toEqual(['c1', 'c2']);
  });

  it('getBookmarks returns local fallback when API returns empty', async () => {
    mockApiClient.get.mockResolvedValue([]);
    const { getBookmarks } = await import('./readerHub.service');
    expect(await getBookmarks()).toEqual([]);
  });

  it('getReadingHistory maps API response correctly', async () => {
    mockApiClient.get.mockResolvedValue([{ comicId: 'c1', chapterId: 'ch1', chapterNumber: 3, updatedAt: '2025-01-01' }]);
    const { getReadingHistory } = await import('./readerHub.service');
    const result = await getReadingHistory();
    expect(result[0]).toMatchObject({ comicId: 'c1', chapterId: 'ch1', chapterNumber: 3 });
  });

  it('getReadingHistory handles snake_case API response', async () => {
    mockApiClient.get.mockResolvedValue([{ comic_id: 'c1', chapter_id: 'ch1', chapter_number: 3, updated_at: '2025-01-01' }]);
    const { getReadingHistory } = await import('./readerHub.service');
    const result = await getReadingHistory();
    expect(result[0]).toMatchObject({ comicId: 'c1', chapterId: 'ch1', chapterNumber: 3 });
  });

  it('recordReadingHistory sends POST and updates localStorage', async () => {
    mockApiClient.post.mockResolvedValue(undefined);
    const { recordReadingHistory, getReadingHistory } = await import('./readerHub.service');
    await recordReadingHistory('c1', 'ch1', 1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/user/history', { comicId: 'c1', chapterId: 'ch1', chapterNumber: 1 });
    const history = await getReadingHistory();
    expect(history[0].comicId).toBe('c1');
  });

  it('toggleBookmark sends POST and updates localStorage', async () => {
    mockApiClient.post.mockResolvedValue(undefined);
    const { toggleBookmark, getBookmarks } = await import('./readerHub.service');
    const added = await toggleBookmark('c1');
    expect(added).toBe(true);
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/user/bookmarks/toggle', { comicId: 'c1' });
    const list = await getBookmarks();
    expect(list).toContain('c1');
  });
});
