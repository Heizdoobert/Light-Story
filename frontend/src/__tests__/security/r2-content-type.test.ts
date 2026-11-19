import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/security/route-auth', () => ({
  requireRouteAuthorization: vi.fn(),
}));

vi.mock('@/lib/r2/s3', () => ({
  getBucketForFolder: vi.fn(),
  putObject: vi.fn(),
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
  return { NextResponse: MockNextResponse, NextRequest: Request };
});

import { POST } from '@/app/api/r2/upload/route';
import { GET } from '@/app/api/r2/proxy/route';
import { NextRequest } from 'next/server';
import { requireRouteAuthorization } from '@/lib/security/route-auth';
import { getBucketForFolder, putObject, getObject } from '@/lib/r2/s3';

const mockRequireAuth = vi.mocked(requireRouteAuthorization);
const mockGetBucket = vi.mocked(getBucketForFolder);
const mockPutObject = vi.mocked(putObject);
const mockGetObject = vi.mocked(getObject);

async function upload(file: File) {
  const form = new FormData();
  form.set('file', file);
  return POST(new NextRequest('http://localhost/api/r2/upload', { method: 'POST', body: form }));
}

describe('R2 content-type hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ ok: true, requester: { id: 'u', role: 'admin' } } as never);
    mockGetBucket.mockReturnValue('test-bucket' as never);
    mockPutObject.mockResolvedValue(undefined);
  });

  it('stores .zip uploaded as text/html with application/zip', async () => {
    const res = await upload(new File(['<script>alert(1)</script>'], 'x.zip', { type: 'text/html' }));
    expect(res.status).toBe(200);
    expect(mockPutObject).toHaveBeenCalledTimes(1);
    expect(mockPutObject.mock.calls[0][3]).toBe('application/zip');
  });

  it('derives content type from extension, not file.type', async () => {
    const cbz = await upload(new File(['data'], 'a.cbz', { type: 'text/html' }));
    expect(cbz.status).toBe(200);
    expect(mockPutObject.mock.calls[0][3]).toBe('application/vnd.comicbook+zip');

    const png = await upload(new File(['data'], 'p.png', { type: 'image/png' }));
    expect(png.status).toBe(200);
    expect(mockPutObject.mock.calls[1][3]).toBe('image/png');
  });

  it('rejects oversized Content-Length with 413 before parsing the body', async () => {
    const formData = vi.fn();
    const res = await POST({
      headers: new Headers({ 'content-length': String(60 * 1024 * 1024) }),
      formData,
    } as never);
    expect(res.status).toBe(413);
    expect(formData).not.toHaveBeenCalled();
  });

  it('proxy serves unsafe stored type as octet-stream attachment', async () => {
    mockGetObject.mockResolvedValue({ body: new Uint8Array([60]), contentType: 'text/html' } as never);
    const res = await GET(new Request('http://localhost/api/r2/proxy?key=chapters/x.zip'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('Content-Disposition')).toBe('attachment');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('proxy serves safe stored image type unchanged', async () => {
    mockGetObject.mockResolvedValue({ body: new Uint8Array([1]), contentType: 'image/png' } as never);
    const res = await GET(new Request('http://localhost/api/r2/proxy?key=chapters/p.png'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Content-Disposition')).toBeNull();
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
