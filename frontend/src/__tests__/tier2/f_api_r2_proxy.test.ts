import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/r2/s3', () => ({
  getBucketForFolder: vi.fn(),
  getObject: vi.fn(),
}));

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

import { GET } from '@/app/api/r2/proxy/route';
import { getBucketForFolder, getObject } from '@/lib/r2/s3';

const mockGetBucket = vi.mocked(getBucketForFolder);
const mockGetObject = vi.mocked(getObject);

function makeRequest(url: string): Request {
  return new Request(url);
}

describe('GET /api/r2/proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBucket.mockReturnValue('test-bucket' as never);
  });

  it('returns 400 when key is missing', async () => {
    const res = await GET(makeRequest('http://localhost/api/r2/proxy'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/missing key/i);
  });

  it('returns 400 for directory traversal with ..', async () => {
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=../../etc/passwd'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/invalid key/i);
  });

  it('returns 400 for backslash in key', async () => {
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=foo\\bar'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for key starting with slash', async () => {
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=/etc/passwd'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid folder', async () => {
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=test.jpg&folder=evil'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/invalid folder/i);
  });

  it('defaults folder to chapters', async () => {
    mockGetObject.mockResolvedValue({ body: new Uint8Array([1, 2, 3]), contentType: 'image/jpeg' });
    await GET(makeRequest('http://localhost/api/r2/proxy?key=test.jpg'));
    expect(mockGetBucket).toHaveBeenCalledWith('chapters');
  });

  it('accepts valid folders: chapters, covers, avatars', async () => {
    mockGetObject.mockResolvedValue({ body: new Uint8Array([1, 2, 3]), contentType: 'image/jpeg' });
    for (const folder of ['chapters', 'covers', 'avatars']) {
      vi.clearAllMocks();
      mockGetBucket.mockReturnValue('test-bucket' as never);
      await GET(makeRequest(`http://localhost/api/r2/proxy?key=test.jpg&folder=${folder}`));
      expect(mockGetBucket).toHaveBeenCalledWith(folder);
    }
  });

  it('returns 500 when storage is not configured', async () => {
    mockGetBucket.mockReturnValue(undefined as never);
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=test.jpg'));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/not configured/i);
  });

  it('returns 404 when object is not found', async () => {
    mockGetObject.mockResolvedValue({ body: undefined, contentType: undefined });
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=nonexistent.jpg'));
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/not found/i);
  });

  it('returns 500 when getObject throws', async () => {
    mockGetObject.mockRejectedValue(new Error('R2 connection failed'));
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=test.jpg'));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/error fetching/i);
  });

  it('returns 413 when object exceeds 50MB', async () => {
    const oversized = new Uint8Array(50 * 1024 * 1024 + 1);
    mockGetObject.mockResolvedValue({ body: oversized, contentType: 'image/jpeg' });
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=huge.jpg'));
    expect(res.status).toBe(413);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/exceeds size/i);
  });

  it('returns binary data with correct cache headers', async () => {
    const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    mockGetObject.mockResolvedValue({ body: imageData, contentType: 'image/jpeg' });
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=test.jpg'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
  });

  it('guesses content type from extension when not provided', async () => {
    mockGetObject.mockResolvedValue({ body: new Uint8Array([1]), contentType: undefined });
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=image.webp'));
    expect(res.headers.get('Content-Type')).toBe('image/webp');
  });

  it('falls back to octet-stream for unknown extensions', async () => {
    mockGetObject.mockResolvedValue({ body: new Uint8Array([1]), contentType: undefined });
    const res = await GET(makeRequest('http://localhost/api/r2/proxy?key=file.xyz'));
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
  });

  it('exposes only GET method', async () => {
    const route = await import('@/app/api/r2/proxy/route');
    expect(route.GET).toBeDefined();
    expect((route as Record<string, unknown>).POST).toBeUndefined();
  });
});
