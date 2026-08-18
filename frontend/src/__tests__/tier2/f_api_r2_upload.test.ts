import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/security/route-auth', () => ({
  requireRouteAuthorization: vi.fn(),
}));

vi.mock('@/lib/r2/s3', () => ({
  getBucketForFolder: vi.fn(),
  putObject: vi.fn(),
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
import { NextRequest } from 'next/server';
import { requireRouteAuthorization } from '@/lib/security/route-auth';
import { getBucketForFolder, putObject } from '@/lib/r2/s3';

const mockRequireAuth = vi.mocked(requireRouteAuthorization);
const mockGetBucket = vi.mocked(getBucketForFolder);
const mockPutObject = vi.mocked(putObject);

function authOk() {
  mockRequireAuth.mockResolvedValue({
    ok: true,
    requester: { id: 'test-user-id', role: 'admin' },
  } as never);
}

function authFail(status = 403) {
  mockRequireAuth.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: 'Forbidden' }), { status }),
  } as never);
}

async function uploadFile(name: string, content: string, type: string, folder?: string) {
  authOk();
  const form = new FormData();
  form.set('file', new File([content], name, { type }));
  if (folder) form.set('folder', folder);
  return POST(new NextRequest('http://localhost/api/r2/upload', { method: 'POST', body: form }));
}

describe('POST /api/r2/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBucket.mockReturnValue('test-bucket' as never);
    mockPutObject.mockResolvedValue(undefined);
  });

  it('returns 403 when auth fails', async () => {
    authFail(403);
    const form = new FormData();
    form.set('file', new File(['data'], 'test.jpg', { type: 'image/jpeg' }));
    const res = await POST(new NextRequest('http://localhost/api/r2/upload', { method: 'POST', body: form }));
    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    authFail(401);
    const form = new FormData();
    form.set('file', new File(['data'], 'test.jpg', { type: 'image/jpeg' }));
    const res = await POST(new NextRequest('http://localhost/api/r2/upload', { method: 'POST', body: form }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file is attached', async () => {
    authOk();
    const form = new FormData();
    form.set('folder', 'chapters');
    const res = await POST(new NextRequest('http://localhost/api/r2/upload', { method: 'POST', body: form }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/missing file/i);
  });

  it('returns 400 for invalid folder', async () => {
    const res = await uploadFile('test.jpg', 'data', 'image/jpeg', 'evil-folder');
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/invalid folder/i);
  });

  it('returns 400 for empty file (0 bytes)', async () => {
    authOk();
    const form = new FormData();
    form.set('file', new File([], 'empty.jpg', { type: 'image/jpeg' }));
    const res = await POST(new NextRequest('http://localhost/api/r2/upload', { method: 'POST', body: form }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/empty|missing/i);
  });

  it('returns 415 for unsupported MIME type', async () => {
    const res = await uploadFile('test.exe', 'MZ', 'application/x-msdownload');
    expect(res.status).toBe(415);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/unsupported/i);
  });

  it('returns 415 for unsupported extension', async () => {
    const res = await uploadFile('script.php', '<?php', 'application/octet-stream');
    expect(res.status).toBe(415);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/unsupported/i);
  });

  it('returns 413 for file exceeding 50MB', async () => {
    const res = await uploadFile('large.jpg', 'x'.repeat(50 * 1024 * 1024 + 1), 'image/jpeg');
    expect(res.status).toBe(413);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/too large/i);
  });

  it('accepts valid JPEG image', async () => {
    const res = await uploadFile('photo.jpg', 'jpeg-data', 'image/jpeg');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.key).toMatch(/^chapters\/.*\.jpg$/);
    expect(mockPutObject).toHaveBeenCalledTimes(1);
    expect(mockPutObject).toHaveBeenCalledWith(
      'test-bucket',
      expect.stringMatching(/^chapters\/.*\.jpg$/),
      expect.any(Uint8Array),
      'image/jpeg',
    );
  });

  it.each([
    ['image.png', 'png-data', 'image/png', '.png'],
    ['photo.webp', 'webp-data', 'image/webp', '.webp'],
    ['comic.cbz', 'zip-data', 'application/x-cbz', '.cbz'],
    ['archive.zip', 'zip-data', 'application/zip', '.zip'],
  ])('accepts %s', async (name, content, type, ext) => {
    const res = await uploadFile(name, content, type);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body.key).toContain(ext);
  });

  it.each([
    ['chapters', 'page.jpg'],
    ['covers', 'cover.jpg'],
    ['avatars', 'avatar.jpg'],
  ])('routes to %s folder when specified', async (folder, filename) => {
    await uploadFile(filename, 'data', 'image/jpeg', folder);
    expect(mockGetBucket).toHaveBeenCalledWith(folder);
  });

  it('generates key with folder/timestamp-uuid.ext format', async () => {
    const res = await uploadFile('chapter.png', 'data', 'image/png');
    const body = await res.json() as Record<string, string>;
    expect(body.key).toMatch(/^chapters\/\d+-[0-9a-f-]+\.png$/);
    expect(body.url).toBe(body.key);
  });

  it('returns 500 when storage is not configured', async () => {
    mockGetBucket.mockReturnValue(undefined as never);
    const res = await uploadFile('test.jpg', 'data', 'image/jpeg');
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/not configured/i);
  });

  it('returns 500 when putObject fails', async () => {
    mockPutObject.mockRejectedValue(new Error('R2 write failed'));
    const res = await uploadFile('test.jpg', 'data', 'image/jpeg');
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/upload failed/i);
  });
});
