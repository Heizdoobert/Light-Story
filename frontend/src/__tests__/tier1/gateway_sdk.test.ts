import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayClient, GatewayError, gatewaySdk } from '@/sdk';

describe('Gateway SDK', () => {
  const mockBaseUrl = 'https://gateway.example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration & Base URL', () => {
    it('uses custom baseUrl and trims trailing slashes', () => {
      const client = new GatewayClient({ baseUrl: 'https://custom-gateway.com///' });
      expect(client.getBaseUrl()).toBe('https://custom-gateway.com');
    });

    it('falls back to default gateway URL when baseUrl is omitted', () => {
      const client = new GatewayClient();
      expect(client.getBaseUrl()).toBeTruthy();
    });

    it('exports singleton gatewaySdk', () => {
      expect(gatewaySdk).toBeInstanceOf(GatewayClient);
    });
  });

  describe('Authentication Injection', () => {
    it('attaches bearer token from getAuthToken provider', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { user: 'test' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      );

      const client = new GatewayClient({
        baseUrl: mockBaseUrl,
        fetch: mockFetch,
        getAuthToken: async () => 'test-supabase-jwt-token',
      });

      await client.request('/api/user/profile');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-supabase-jwt-token');
    });

    it('preserves existing explicit Authorization header', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: {} }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      );

      const client = new GatewayClient({
        baseUrl: mockBaseUrl,
        fetch: mockFetch,
        getAuthToken: async () => 'auto-token',
      });

      await client.request('/api/custom', {
        headers: { Authorization: 'Bearer manual-token' },
      });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer manual-token');
    });
  });

  describe('Health API', () => {
    it('calls /api/health and returns status payload', async () => {
      const healthPayload = { status: 'ok', worker: 'kv-worker', timestamp: '2026-10-16T12:00:00Z' };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(healthPayload), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const result = await client.health.check();

      expect(result).toEqual(healthPayload);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/health',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('R2 / Media API', () => {
    it('uploads file via multipart/form-data to /api/admin/r2/upload', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { key: 'comics/1/chapter-1/001.webp', url: 'https://r2.example/001.webp' },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const blob = new Blob(['dummy content'], { type: 'image/webp' });

      const result = await client.r2.upload(blob, {
        filename: '001.webp',
        folder: 'comics',
        comicId: 'comic-123',
        chapterNumber: 1,
        pageNumber: 1,
      });

      expect(result).toEqual({
        key: 'comics/1/chapter-1/001.webp',
        url: 'https://r2.example/001.webp',
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('https://gateway.example.com/api/admin/r2/upload');
      expect(call[1].method).toBe('POST');
      expect(call[1].body).toBeInstanceOf(FormData);
    });

    it('requests presigned URL via /api/admin/r2/signed-url', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { signedUrl: '/api/admin/r2/file/test.webp?expires=3600&sig=abc' },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const res = await client.r2.getSignedUrl('test.webp', 1800);

      expect(res.signedUrl).toContain('test.webp');
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('https://gateway.example.com/api/admin/r2/signed-url');
      expect(JSON.parse(call[1].body)).toEqual({ key: 'test.webp', expires: 1800 });
    });

    it('constructs media and file helper URLs correctly', () => {
      const client = new GatewayClient({ baseUrl: 'https://gw.com' });
      expect(client.r2.getMediaUrl('covers/comic.png')).toBe('https://gw.com/api/media/covers%2Fcomic.png');
      expect(client.r2.getFileUrl('covers/comic.png')).toBe('https://gw.com/api/admin/r2/file/covers%2Fcomic.png');
    });

    it('lists R2 bucket objects with query parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { objects: [{ key: 'cover.jpg', size: 1024, uploaded: '2026-10-16' }] },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const res = await client.r2.list({ prefix: 'covers/', limit: 10 });

      expect(res.objects).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/admin/r2/list?prefix=covers%2F&limit=10',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('Comics API', () => {
    it('lists comics with query filters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'comic-1', title: 'Solo Leveling', status: 'ongoing' }],
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const comics = await client.comics.list({ page: 1, limit: 20, status: 'ongoing', search: 'Solo' });

      expect(comics).toHaveLength(1);
      expect(comics[0].title).toBe('Solo Leveling');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/comics?page=1&limit=20&status=ongoing&search=Solo',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('fetches comic details and recommendations', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 'comic-1', title: 'Tower of God' },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const comic = await client.comics.getById('comic-1');
      expect(comic.title).toBe('Tower of God');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/comics/comic-1',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('creates comic via POST /api/comics', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 'c-new', title: 'New Comic' },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const created = await client.comics.create({ title: 'New Comic', status: 'ongoing' });

      expect(created.id).toBe('c-new');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/comics',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Comic', status: 'ongoing' }),
        })
      );
    });
  });

  describe('Stories API', () => {
    it('lists categories and records view', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/categories')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: true, data: [{ id: 'cat-1', name: 'Action', slug: 'action' }] }),
              { headers: { 'Content-Type': 'application/json' }, status: 200 }
            )
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          })
        );
      });

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const cats = await client.stories.getCategories();
      expect(cats[0].name).toBe('Action');

      const viewRes = await client.stories.recordView('story-1');
      expect(viewRes.success).toBe(true);
    });
  });

  describe('User API', () => {
    it('manages bookmarks and history', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
        if (url.includes('/api/user/bookmarks/toggle')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: true, data: { bookmarked: true } }),
              { headers: { 'Content-Type': 'application/json' }, status: 200 }
            )
          );
        }
        if (url.includes('/api/user/history') && init.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [] }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          })
        );
      });

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const toggle = await client.user.toggleBookmark('comic-1');
      expect(toggle.bookmarked).toBe(true);

      const histRes = await client.user.saveHistory({ comic_id: 'c-1', progress: 80 });
      expect(histRes.success).toBe(true);
    });
  });

  describe('Analytics API', () => {
    it('fetches overview and records view event', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { totalViews: 1250, uniqueVisitors: 300 },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const overview = await client.analytics.getOverview();
      expect(overview.totalViews).toBe(1250);

      await client.analytics.recordView({ target_id: 'comic-99', type: 'comic' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Admin API', () => {
    it('fetches site settings with scope parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ key: 'public_site_title', value: 'Light Story' }],
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });
      const settings = await client.admin.getSiteSettings('public');
      expect(settings).toEqual([{ key: 'public_site_title', value: 'Light Story' }]);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.example.com/api/admin/site-settings?scope=public',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('Error Handling', () => {
    it('throws GatewayError with error code and status on HTTP 401', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'JWT token invalid or expired' },
            }),
            { headers: { 'Content-Type': 'application/json' }, status: 401 }
          )
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });

      await expect(client.request('/api/admin/sensitive')).rejects.toThrow(GatewayError);

      try {
        await client.request('/api/admin/sensitive');
      } catch (err: unknown) {
        const error = err as GatewayError;
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.status).toBe(401);
        expect(error.message).toBe('JWT token invalid or expired');
      }
    });

    it('throws GatewayError on network failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch });

      await expect(client.request('/api/health')).rejects.toThrow(GatewayError);
      try {
        await client.request('/api/health');
      } catch (err: unknown) {
        const error = err as GatewayError;
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.status).toBe(0);
      }
    });

    it('handles non-JSON error responses gracefully', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response('502 Bad Gateway', {
            headers: { 'Content-Type': 'text/plain' },
            status: 502,
            statusText: 'Bad Gateway',
          })
        )
      );

      const client = new GatewayClient({ baseUrl: mockBaseUrl, fetch: mockFetch, retry: false });

      try {
        await client.request('/api/broken');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GatewayError);
        const error = err as GatewayError;
        expect(error.status).toBe(502);
        expect(error.message).toBe('502 Bad Gateway');
      }
    });
  });
});
