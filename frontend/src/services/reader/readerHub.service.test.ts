import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getReadingHistory, mirrorReadingHistory } from './readerHub.service';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('readerHub.service - LocalStorage Fallback', () => {
  it('records reading history in localStorage when guest', async () => {
    mirrorReadingHistory({ comicId: 'comic-101', chapterId: 'chap-5', chapterNumber: 5 });
    const history = await getReadingHistory();
    expect(history).toHaveLength(1);
    expect(history[0].comicId).toBe('comic-101');
    expect(history[0].chapterNumber).toBe(5);
  });
});
