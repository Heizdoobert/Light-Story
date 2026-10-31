import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayClient } from '../index';

describe('Gateway Domain API Modules', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ComicsClient', () => {
    it('calls GET /api/comics with parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'comic-1', title: 'Solo Leveling' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const comics = await client.comics.list({ page: 1, limit: 20, status: 'ongoing' });

      expect(comics).toEqual([{ id: 'comic-1', title: 'Solo Leveling' }]);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/comics?page=1&limit=20&status=ongoing',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('fetches comic detail by ID or slug', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 'comic-1', title: 'Solo Leveling', chapters: [] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const comic = await client.comics.getById('solo-leveling');

      expect(comic.title).toBe('Solo Leveling');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/comics/solo-leveling',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('StoriesClient', () => {
    it('fetches categories and records story views', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'cat-1', name: 'Action', slug: 'action' }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ success: true, data: { success: true } }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const categories = await client.stories.getCategories();
      expect(categories).toEqual([{ id: 'cat-1', name: 'Action', slug: 'action' }]);

      const viewRes = await client.stories.recordView('story-99');
      expect(viewRes).toEqual({ success: true });
    });
  });

  describe('R2Client', () => {
    it('generates signed URLs for R2 assets', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { signedUrl: 'https://r2.light-story.test/signed-key', expires: 3600 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.r2.getSignedUrl('covers/comic-1.webp', 3600);

      expect(res.signedUrl).toBe('https://r2.light-story.test/signed-key');
    });

    it('formats public media URLs correctly', () => {
      const client = new GatewayClient({ baseUrl });
      const url = client.r2.getMediaUrl('comics/ch1/p1.webp');
      expect(url).toBe('https://api.light-story.test/api/media/comics%2Fch1%2Fp1.webp');
    });
  });

  describe('UserClient & Bookmarks', () => {
    it('toggles user bookmark for a comic', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { bookmarked: true } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.user.toggleBookmark('comic-123');

      expect(res.bookmarked).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/user/bookmarks/toggle',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ comicId: 'comic-123' }),
        }),
      );
    });
  });

  describe('HealthClient', () => {
    it('checks health status endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { status: 'ok', worker: 'kv-worker', timestamp: '2026-10-18T00:00:00Z' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const health = await client.health.check();

      expect(health.status).toBe('ok');
      expect(health.worker).toBe('kv-worker');
    });
  });
});
