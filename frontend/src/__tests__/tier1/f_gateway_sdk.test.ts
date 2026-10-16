import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGatewayClient,
  GatewayClient,
  GatewayError,
} from '@/sdk/gateway';

describe('Gateway SDK Unit Tests', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('initializes with default config and resolves base URL per ADR-001', () => {
    const client = new GatewayClient({ fetch: mockFetch });
    expect(client.getBaseUrl()).toBeTruthy();
    expect(typeof client.getBaseUrl()).toBe('string');
  });

  it('respects custom baseUrl when provided', () => {
    const customUrl = 'https://custom-gateway.worker.dev';
    const client = createGatewayClient({ baseUrl: customUrl, fetch: mockFetch });
    expect(client.getBaseUrl()).toBe(customUrl);
  });

  it('attaches Bearer token from getAccessToken', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { status: 'ok' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createGatewayClient({
      baseUrl: 'http://localhost:8787',
      fetch: mockFetch,
      getAccessToken: async () => 'test-token-123',
    });

    await client.health.check();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:8787/api/health');
    const headers = new Headers(calledInit.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token-123');
  });

  it('allows explicit token override on individual requests', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { status: 'ok' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createGatewayClient({
      baseUrl: 'http://localhost:8787',
      fetch: mockFetch,
      getAccessToken: async () => 'default-token',
    });

    await client.health.check({ token: 'override-token-456' });

    const [, calledInit] = mockFetch.mock.calls[0];
    const headers = new Headers(calledInit.headers);
    expect(headers.get('Authorization')).toBe('Bearer override-token-456');
  });

  it('unwraps { success: true, data: T } response automatically', async () => {
    const payload = { id: 'comic-1', title: 'Test Comic' };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: payload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createGatewayClient({
      baseUrl: 'http://localhost:8787',
      fetch: mockFetch,
    });

    const result = await client.comics.getById('comic-1');
    expect(result).toEqual(payload);
  });

  it('throws GatewayError with status, message and code on HTTP failure', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = createGatewayClient({
      baseUrl: 'http://localhost:8787',
      fetch: mockFetch,
    });

    await expect(client.comics.getById('protected-id')).rejects.toThrow(GatewayError);

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    try {
      await client.comics.getById('protected-id');
    } catch (e) {
      expect(e).toBeInstanceOf(GatewayError);
      const err = e as GatewayError;
      expect(err.status).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Token expired');
    }
  });

  describe('Sub-clients methods verification', () => {
    let client: GatewayClient;

    beforeEach(() => {
      client = createGatewayClient({
        baseUrl: 'http://localhost:8787',
        fetch: mockFetch,
      });
    });

    it('R2Client methods produce correct endpoint requests', async () => {
      // getSignedUrl
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { signedUrl: '/media/test.jpg' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const signedRes = await client.r2.getSignedUrl('test.jpg');
      expect(signedRes.signedUrl).toBe('/media/test.jpg');
      expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:8787/api/admin/r2/signed-url');

      // list
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { objects: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      await client.r2.list({ prefix: 'covers/' });
      expect(mockFetch.mock.calls[1][0]).toContain('/api/admin/r2/list?prefix=covers');

      // publicMediaUrl
      const publicUrl = client.r2.getPublicMediaUrl('covers/comic-1.png');
      expect(publicUrl).toBe('http://localhost:8787/api/media/covers/comic-1.png');
    });

    it('ComicsClient methods produce correct endpoint requests', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [{ id: '1', title: 'Comic 1' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await client.comics.list({ page: 2, pageSize: 20, keyword: 'action' });
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/comics');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('pageSize=20');
      expect(calledUrl).toContain('keyword=action');
    });

    it('UserClient methods produce correct endpoint requests', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [{ comic_id: 'c1' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await client.user.getBookmarks(10);
      expect(mockFetch.mock.calls[0][0]).toContain('/api/user/bookmarks?pageSize=10');

      // addBookmark
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { bookmarked: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const addRes = await client.user.addBookmark('c2');
      expect(addRes.bookmarked).toBe(true);
      expect(mockFetch.mock.calls[1][0]).toBe('http://localhost:8787/api/user/bookmarks/add');
    });

    it('AnalyticsClient methods produce correct endpoint requests', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { totalStories: 50, recentChapters: 12 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const overview = await client.analytics.getOverview();
      expect(overview.totalStories).toBe(50);
      expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:8787/api/analytics/overview');
    });

    it('AdminClient methods produce correct endpoint requests', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { site_name: 'Light Story' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await client.admin.getSiteSettings('public');
      expect(mockFetch.mock.calls[0][0]).toContain('/api/admin/site-settings?scope=public');
    });
  });
});
