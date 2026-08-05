import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveReadingProgress, clearReadingHistory } from '../reading-history.actions';
import * as serverApi from '@/lib/api/server';
import { revalidateTag } from 'next/cache';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('reading-history.actions server actions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('saveReadingProgress', () => {
    it('saves progress and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await saveReadingProgress({
        comicId: 'comic-101',
        chapterId: 'chap-202',
        chapterNumber: 5,
      });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/user/history');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        comicId: 'comic-101',
        chapterId: 'chap-202',
        chapterNumber: 5,
      });
      expect(revalidateTag).toHaveBeenCalledWith('reading-history', 'max');
    });

    it('returns error when input validation fails (e.g. empty comicId)', async () => {
      const res = await saveReadingProgress({
        comicId: '',
        chapterId: 'chap-202',
        chapterNumber: 5,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('returns error message when backend responds with error status', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await saveReadingProgress({
        comicId: 'comic-101',
        chapterId: 'chap-202',
        chapterNumber: 5,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('clearReadingHistory', () => {
    it('clears reading history via DELETE and revalidates tag on success', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await clearReadingHistory();

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/user/history');
      expect(options.method).toBe('DELETE');
      expect(revalidateTag).toHaveBeenCalledWith('reading-history', 'max');
    });

    it('returns error message when clear backend request fails', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Failed to clear history' }), { status: 500 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await clearReadingHistory();

      expect(res.success).toBe(false);
      expect(res.error).toBe('Failed to clear history');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});
