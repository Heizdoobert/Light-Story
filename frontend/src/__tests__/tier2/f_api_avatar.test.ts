import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
    }
  }
  return { NextResponse: MockNextResponse };
});

import { GET } from '@/app/api/avatar/route';

function makeRequest(url: string): Request {
  return new Request(url);
}

const VALID_SUPABASE_URL = 'https://abc123.supabase.co/storage/v1/object/public/avatars/test.jpg';
const INVALID_ORIGIN_URL = 'https://evil.com/steal-data';
const NON_STORAGE_PATH = 'https://abc123.supabase.co/storage/v1/object/public/buckets/test.jpg';

describe('GET /api/avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when url param is missing', async () => {
    const res = await GET(makeRequest('http://localhost/api/avatar'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/missing url/i);
  });

  it('returns 400 for malformed URL', async () => {
    const res = await GET(makeRequest('http://localhost/api/avatar?url=not-a-url'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/invalid url/i);
  });

  it('returns 403 for non-supabase hostname', async () => {
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(INVALID_ORIGIN_URL)}`));
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/not allowed/i);
  });

  it('returns 403 for supabase hostname but wrong storage path', async () => {
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(NON_STORAGE_PATH)}`));
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/not allowed/i);
  });

  it('returns 403 for supabase hostname with root path', async () => {
    const url = 'https://abc123.supabase.co/auth/v1/user';
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(url)}`));
    expect(res.status).toBe(403);
  });

  it('returns 403 for non-Supabase hostname', async () => {
    const ssrfUrls = [
      'http://127.0.0.1/admin',
      'http://169.254.169.254/metadata',
      'http://[::1]/',
      'http://0x7f000001/',
    ];
    for (const ssrfUrl of ssrfUrls) {
      const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(ssrfUrl)}`));
      expect(res.status).toBe(403);
    }
  });

  it('returns 403 for supabase.co hostname with path traversal in avatar path', async () => {
    const maliciousUrl = 'https://attacker.supabase.co/storage/v1/object/public/avatars/../../secrets/secret.json';
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(maliciousUrl)}`));
    expect(res.status).toBe(403);
  });

  it('blocks data: and file: protocol URLs', async () => {
    const dangerousUrls = [
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
    ];
    for (const url of dangerousUrls) {
      const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(url)}`));
      expect(res.status).toBe(403);
    }
  });

  it('exposes only GET method', async () => {
    const route = await import('@/app/api/avatar/route');
    expect(route.GET).toBeDefined();
    expect((route as Record<string, unknown>).POST).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
  });

  it('proxies valid Supabase avatar with immutable cache headers', async () => {
    const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(imageBytes, {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(imageBytes.length) },
      }),
    );
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(VALID_SUPABASE_URL)}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(fetchSpy).toHaveBeenCalledWith(VALID_SUPABASE_URL, { redirect: 'manual' });
    fetchSpy.mockRestore();
  });

  it('returns 502 when upstream returns redirect', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 301, statusText: 'Moved', headers: { Location: 'https://other.com' } }),
    );
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(VALID_SUPABASE_URL)}`));
    expect(res.status).toBe(502);
    fetchSpy.mockRestore();
  });

  it('returns 502 when upstream returns non-image content-type', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not an image', {
        status: 200,
        headers: { 'Content-Type': 'text/html', 'Content-Length': '12' },
      }),
    );
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(VALID_SUPABASE_URL)}`));
    expect(res.status).toBe(502);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/non-image/i);
    fetchSpy.mockRestore();
  });

  it('returns 503 when upstream image exceeds 5MB', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(1), {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(6 * 1024 * 1024) },
      }),
    );
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(VALID_SUPABASE_URL)}`));
    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/size limit/i);
    fetchSpy.mockRestore();
  });

  it('returns 500 when fetch throws', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));
    const res = await GET(makeRequest(`http://localhost/api/avatar?url=${encodeURIComponent(VALID_SUPABASE_URL)}`));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/error fetching/i);
    fetchSpy.mockRestore();
  });
});
