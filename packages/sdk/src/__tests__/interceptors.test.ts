import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../client';

describe('HttpClient Interceptors (TDD - RED Phase)', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes request interceptor to append custom headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new HttpClient({ baseUrl, fetch: mockFetch });

    // Register request interceptor
    client.interceptors.request.use((req) => {
      const headers = new Headers(req.headers);
      headers.set('X-Correlation-ID', 'corr-12345');
      return { ...req, headers };
    });

    await client.get('/api/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('X-Correlation-ID')).toBe('corr-12345');
  });

  it('supports async request interceptors that resolve dynamic headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new HttpClient({ baseUrl, fetch: mockFetch });

    client.interceptors.request.use(async (req) => {
      await new Promise((r) => setTimeout(r, 5));
      const headers = new Headers(req.headers);
      headers.set('X-Client-Timestamp', '1700000000');
      return { ...req, headers };
    });

    await client.get('/api/timestamp');
    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('X-Client-Timestamp')).toBe('1700000000');
  });

  it('allows ejecting/unsubscribing a registered interceptor', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new HttpClient({ baseUrl, fetch: mockFetch });

    const eject = client.interceptors.request.use((req) => {
      const headers = new Headers(req.headers);
      headers.set('X-Temporary', 'temp-val');
      return { ...req, headers };
    });

    // Unsubscribe the interceptor before calling
    eject();

    await client.get('/api/ejected');
    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.has('X-Temporary')).toBe(false);
  });

  it('executes response interceptors to inspect or transform response data', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rawValue: 42 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new HttpClient({ baseUrl, fetch: mockFetch });

    client.interceptors.response.use((_response, data) => {
      if (data && typeof data === 'object') {
        return { ...(data as Record<string, unknown>), transformed: true };
      }
      return data;
    });

    const res = await client.get<{ rawValue: number; transformed?: boolean }>('/api/transform');
    expect(res).toEqual({ rawValue: 42, transformed: true });
  });

  it('executes multiple interceptors in FIFO registration order', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ trace: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new HttpClient({ baseUrl, fetch: mockFetch });
    const sequence: number[] = [];

    client.interceptors.request.use((req) => {
      sequence.push(1);
      return req;
    });

    client.interceptors.request.use((req) => {
      sequence.push(2);
      return req;
    });

    await client.get('/api/order');
    expect(sequence).toEqual([1, 2]);
  });

  it('propagates errors thrown inside request interceptor without triggering network fetch', async () => {
    const mockFetch = vi.fn();
    const client = new HttpClient({ baseUrl, fetch: mockFetch });

    client.interceptors.request.use(() => {
      throw new Error('Blocked by auth validation interceptor');
    });

    await expect(client.get('/api/blocked')).rejects.toThrow('Blocked by auth validation interceptor');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
