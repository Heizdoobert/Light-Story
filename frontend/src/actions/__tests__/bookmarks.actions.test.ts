import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addBookmark, removeBookmark, toggleBookmark } from '../bookmarks.actions';
import * as serverApi from '@/lib/api/server';
import { revalidateTag } from 'next/cache';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('bookmarks.actions server actions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('addBookmark', () => {
    it('adds bookmark and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ bookmarked: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await addBookmark('comic-101');

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/user/bookmarks/add');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ comicId: 'comic-101' });
      expect(revalidateTag).toHaveBeenCalledWith('bookmarks', 'max');
    });

    it('returns error when input validation fails (e.g. empty comicId)', async () => {
      const res = await addBookmark('');

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

      const res = await addBookmark('comic-101');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('removeBookmark', () => {
    it('removes bookmark and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ bookmarked: false }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await removeBookmark('comic-101');

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/user/bookmarks/remove');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ comicId: 'comic-101' });
      expect(revalidateTag).toHaveBeenCalledWith('bookmarks', 'max');
    });

    it('returns error when input validation fails (e.g. empty comicId)', async () => {
      const res = await removeBookmark('');

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('toggleBookmark', () => {
    it('toggles bookmark and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ bookmarked: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await toggleBookmark('comic-101');

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/user/bookmarks/toggle');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ comicId: 'comic-101' });
      expect(revalidateTag).toHaveBeenCalledWith('bookmarks', 'max');
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
        new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await toggleBookmark('comic-101');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Server error');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});
