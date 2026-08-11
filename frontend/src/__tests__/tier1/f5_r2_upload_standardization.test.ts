import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('@/lib/api/apiClient', () => ({ apiClient: {} }));
vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

import {
  uploadChapterImages,
  uploadComicCover,
} from '@/services/comics/comic.service';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

const WORKER_INDEX = 'workers/kv-worker/src/index.ts';
const COMIC_SERVICE = 'frontend/src/services/comics/comic.service.ts';

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

function okResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

function errorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ success: false, error: { message } }),
  } as unknown as Response;
}

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/png' });
}

describe('F5 R2 upload standardization', () => {
  beforeEach(() => {
    localStorage.clear();
    process.env.NEXT_PUBLIC_GATEWAY_URL = 'http://localhost:8787';
    process.env.NEXT_PUBLIC_R2_BUCKET_COVERS = 'covers';
    process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS = 'chapters';
    delete process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEV_FALLBACK;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('worker gateway serves the R2 upload contract with bucket/error handling', () => {
    const source = readRepoFile(WORKER_INDEX);
    expect(source).toContain('R2_NOT_CONFIGURED');
    expect(source).toContain('Invalid key path');
    expect(source).toContain('File not found');
  });

  it('uploads chapter images via POST to /api/admin/r2/upload (raw fetch, not apiClient)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ success: true, data: { urls: ['https://cdn.example.com/a.webp'] } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await uploadChapterImages([makeFile('p1.png'), makeFile('p2.png')], 'comic-1', 3);

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/api/admin/r2/upload');
    expect((init as RequestInit).method).toBe('POST');

    const body = (init as RequestInit).body as FormData;
    expect(body.get('folder')).toBe('chapters');
    expect(body.get('comicId')).toBe('comic-1');
    expect(body.get('chapterNumber')).toBe('3');
    expect(body.getAll('file')).toHaveLength(2);
  });

  it('sends Authorization bearer token and x-r2-bucket headers', async () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.sig';
    localStorage.setItem(
      'sb-test-auth-token',
      JSON.stringify({ access_token: token }),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ success: true, data: { urls: ['https://cdn.example.com/a.webp'] } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await uploadChapterImages([makeFile('p1.png')], 'comic-1');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${token}`);
    expect(headers['x-r2-bucket']).toBe('chapters');
  });

  it('maps the { url, key }-style upload response to returned urls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ success: true, data: { urls: ['https://cdn.example.com/1.webp', 'https://cdn.example.com/2.webp'] } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const urls = await uploadChapterImages([makeFile('a.png'), makeFile('b.png')], 'comic-1', 2);
    expect(urls).toEqual(['https://cdn.example.com/1.webp', 'https://cdn.example.com/2.webp']);
  });

  it('surfaces worker errors as thrown messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(500, 'R2 bucket not bound')));

    await expect(uploadChapterImages([makeFile('a.png')], 'comic-1')).rejects.toThrow(
      'R2 bucket not bound',
    );
  });

  it('uploadComicCover posts to the covers bucket and throws when no url is returned', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ success: true, data: { urls: ['https://cdn.example.com/cover.webp'] } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const coverUrl = await uploadComicCover(makeFile('cover.png'), 'comic-1');
    expect(coverUrl).toBe('https://cdn.example.com/cover.webp');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['x-r2-bucket']).toBe('covers');

    fetchMock.mockResolvedValue(okResponse({ success: true, data: { urls: [] } }));
    await expect(uploadComicCover(makeFile('cover.png'), 'comic-1')).rejects.toThrow(
      'Unable to upload comic cover',
    );
  });

  it('DEVIATION: upload uses raw fetch (not apiClient) against the gateway R2 route via ROUTES (not spec /api/admin/upload-to-r2)', () => {
    const source = readRepoFile(COMIC_SERVICE);
    expect(source).toContain('fetch(`${getGatewayUrl()}${ROUTES.API.ADMIN.R2_UPLOAD_GATEWAY}`');
    expect(source).not.toContain('/api/admin/upload-to-r2');
  });
});
