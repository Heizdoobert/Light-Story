import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../client';
import { GatewayError, SdkTimeoutError, SdkNetworkError } from '../errors';
import { SdkLogger } from '../types';

describe('HttpClient', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL building & parameter serialization', () => {
    it('correctly constructs full URL without trailing slashes', () => {
      const client = new HttpClient({ baseUrl: `${baseUrl}/` });
      expect(client.getBaseUrl()).toBe(baseUrl);
      expect(client.buildUrl('/api/test')).toBe(`${baseUrl}/api/test`);
      expect(client.buildUrl('api/test')).toBe(`${baseUrl}/api/test`);
    });

    it('serializes query params and filters out null/undefined', () => {
      const client = new HttpClient({ baseUrl });
      const url = client.buildUrl('/api/comics', {
        page: 2,
        limit: 10,
        active: true,
        empty: undefined,
        blank: null,
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get('page')).toBe('2');
      expect(parsed.searchParams.get('limit')).toBe('10');
      expect(parsed.searchParams.get('active')).toBe('true');
      expect(parsed.searchParams.has('empty')).toBe(false);
      expect(parsed.searchParams.has('blank')).toBe(false);
    });
  });

  describe('Token resolution & headers', () => {
    it('injects bearer token from getAuthToken callback', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        getAuthToken: () => 'dynamic-test-jwt',
      });

      await client.get('/api/me');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, init] = mockFetch.mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer dynamic-test-jwt');
    });

    it('prefers explicit request token over global getter', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        getAuthToken: () => 'global-token',
      });

      await client.get('/api/me', { token: 'explicit-token' });
      const [, init] = mockFetch.mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer explicit-token');
    });

    it('unwraps Gateway standard { success: true, data: T } envelopes', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { user: 'alice' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new HttpClient({ baseUrl, fetch: mockFetch });
      const data = await client.get<{ user: string }>('/api/user');
      expect(data).toEqual({ user: 'alice' });
    });
  });

  describe('Resilience & Safe Idempotency Retry Logic', () => {
    it('automatically retries idempotent GET requests on 503 and succeeds', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, data: { healthy: true } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        retry: { backoffBaseMs: 10, maxRetries: 2 },
      });

      const res = await client.get<{ healthy: boolean }>('/api/health');
      expect(res).toEqual({ healthy: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry POST mutations by default on 500 error to prevent duplicate side effects', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Internal Error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        retry: { backoffBaseMs: 10, maxRetries: 3 },
      });

      await expect(client.post('/api/orders', { item: 1 })).rejects.toThrow(GatewayError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries POST when caller explicitly opts in with retry: true', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response('Gateway Timeout', { status: 504 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, data: { created: true } }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        retry: { backoffBaseMs: 10, maxRetries: 2 },
      });

      const res = await client.post<{ created: boolean }>(
        '/api/idempotent-post',
        { id: 'uuid-123' },
        { retry: true },
      );
      expect(res).toEqual({ created: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('respects Retry-After header on 429 Rate Limit responses', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response('Too Many Requests', {
            status: 429,
            headers: { 'retry-after': '0.02' }, // 20ms
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, data: { ok: true } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        retry: { backoffBaseMs: 10, maxRetries: 2 },
      });

      const res = await client.get<{ ok: boolean }>('/api/limited');
      expect(res).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws GatewayError with parsed code and message when maxRetries exhausted', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: 'DB Connection pool timeout', code: 'DB_TIMEOUT' } }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        retry: { backoffBaseMs: 10, maxRetries: 2 },
      });

      try {
        await client.get('/api/exhausted');
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(GatewayError);
        const gwErr = err as GatewayError;
        expect(gwErr.status).toBe(503);
        expect(gwErr.code).toBe('DB_TIMEOUT');
        expect(gwErr.message).toBe('DB Connection pool timeout');
      }
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Timeouts & AbortSignal', () => {
    it('throws SdkTimeoutError when request duration exceeds timeoutMs', async () => {
      const mockFetch = vi.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        timeoutMs: 40,
        retry: false,
      });

      await expect(client.get('/api/slow')).rejects.toThrow(SdkTimeoutError);
    });

    it('immediately cancels if caller passes an already aborted signal', async () => {
      const controller = new AbortController();
      controller.abort(new Error('User cancelled'));

      const mockFetch = vi.fn();
      const client = new HttpClient({ baseUrl, fetch: mockFetch });

      await expect(client.get('/api/cancel', { signal: controller.signal })).rejects.toThrow('User cancelled');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Pluggable SdkLogger', () => {
    it('invokes logger callbacks during request lifecycle', async () => {
      const logger: SdkLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response('Error', { status: 502 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const client = new HttpClient({
        baseUrl,
        fetch: mockFetch,
        logger,
        retry: { backoffBaseMs: 10, maxRetries: 2 },
      });

      await client.get('/api/logged');
      expect(logger.debug).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Adversarial & Edge Cases (Doubt-Driven)', () => {
    it('preserves absolute URLs when baseUrl is configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new HttpClient({ baseUrl: 'https://gateway.internal', fetch: mockFetch });
      await client.get('https://external-auth.com/oauth/token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://external-auth.com/oauth/token',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('serializes plain objects to JSON and preserves text/Blob bodies without double serialization', async () => {
      let capturedBody: unknown;
      let capturedHeaders: Headers | undefined;

      const mockFetch = vi.fn().mockImplementation((url, init) => {
        capturedBody = init.body;
        capturedHeaders = init.headers;
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      });

      const client = new HttpClient({ baseUrl, fetch: mockFetch });

      // Object -> auto-serialized JSON
      await client.post('/api/json', { title: 'Solo Leveling' });
      expect(capturedBody).toBe('{"title":"Solo Leveling"}');
      expect(capturedHeaders?.get('Content-Type')).toBe('application/json');

      // String -> untouched
      await client.post('/api/text', 'plain text payload');
      expect(capturedBody).toBe('plain text payload');
    });

    it('throws GatewayError when API envelope has success: false', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { message: 'Chapter not found', code: 'CHAPTER_NOT_FOUND' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new HttpClient({ baseUrl, fetch: mockFetch });
      await expect(client.get('/api/chapter/999')).rejects.toThrow('Chapter not found');
    });
  });
});
