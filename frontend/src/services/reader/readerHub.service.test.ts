import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBookmarks, toggleBookmark, getReadingHistory, recordReadingHistory } from './readerHub.service';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('readerHub.service - LocalStorage Fallback', () => {
  it('toggles bookmark in localStorage when guest', async () => {
    const isBookmarked = await toggleBookmark('comic-101');
    expect(isBookmarked).toBe(true);

    const list = await getBookmarks();
    expect(list).toContain('comic-101');

    const toggledOff = await toggleBookmark('comic-101');
    expect(toggledOff).toBe(false);
  });

  it('records reading history in localStorage when guest', async () => {
    await recordReadingHistory('comic-101', 'chap-5', 5);
    const history = await getReadingHistory();
    expect(history).toHaveLength(1);
    expect(history[0].comicId).toBe('comic-101');
    expect(history[0].chapterNumber).toBe(5);
  });
});
