import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('@/lib/api/apiClient', () => ({ apiClient: {} }));
vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

import {
  uploadChapterImages,
  uploadComicCover,
} from '@/services/comics/comic.service';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

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

describe('F5 R2 upload standardization boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEV_FALLBACK;
    delete process.env.NEXT_PUBLIC_GATEWAY_URL;
    delete process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('accepts an empty file list without throwing, sends an empty file field set, returns response urls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true, data: { urls: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    const urls = await uploadChapterImages([], 'comic-1', 1);

    expect(urls).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(body.getAll('file')).toHaveLength(0);
    expect(body.get('folder')).toBe('chapters');
  });

  it('rejects with a TypeError when non-File garbage is passed in the file list', async () => {
    vi.stubGlobal('fetch', vi.fn());

    await expect(
      uploadChapterImages(['x.png'] as unknown as File[], 'comic-1'),
    ).rejects.toThrow(TypeError);
  });

  it('rejects when the gateway URL is malformed (URL parse failure surfaces, no dev fallback)', async () => {
    process.env.NEXT_PUBLIC_GATEWAY_URL = 'not-a-url';
    // ponytail: happy-dom fetch resolves relative URLs against window.location (http://localhost:3000)
    // and attempts real connections, so simulate undici's ERR_INVALID_URL instead of relying on the environment.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to parse URL')));

    await expect(
      uploadChapterImages([makeFile('a.png')], 'comic-1'),
    ).rejects.toThrow(TypeError);
  });

  it('falls back to the local gateway default when NEXT_PUBLIC_GATEWAY_URL is empty', async () => {
    process.env.NEXT_PUBLIC_GATEWAY_URL = '';
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true, data: { urls: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadChapterImages([makeFile('a.png')], 'comic-1');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin).toBe('http://localhost:8787');
    expect(url.pathname).toBe('/api/admin/r2/upload');
  });

  it('DEVIATION: bucket env fallback makes the !bucket guard unreachable through the public API', async () => {
    process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS = '';
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true, data: { urls: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadChapterImages([makeFile('a.png')], 'comic-1');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['x-r2-bucket']).toBe('chapters');

    const source = readRepoFile(COMIC_SERVICE);
    expect(source).toContain("throw new Error('R2 bucket is not configured')");
  });

  it('surfaces a rejected fetch (network failure) as the original error, no dev fallback in test env', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(uploadChapterImages([makeFile('a.png')], 'comic-1')).rejects.toThrow(
      'network down',
    );
  });

  it('throws for 4xx and 5xx responses with the worker-provided message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(404, 'Route not found')));
    await expect(uploadChapterImages([makeFile('a.png')], 'comic-1')).rejects.toThrow(
      'Route not found',
    );

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(500, 'R2 bucket not bound')));
    await expect(uploadChapterImages([makeFile('a.png')], 'comic-1')).rejects.toThrow(
      'R2 bucket not bound',
    );
  });

  it('returns [] for a 200 response with no urls, and cover upload throws for empty url list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ success: true })));
    const urls = await uploadChapterImages([makeFile('a.png')], 'comic-1');
    expect(urls).toEqual([]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ success: true, data: {} })));
    await expect(uploadComicCover(makeFile('c.png'), 'comic-1')).rejects.toThrow(
      'Unable to upload comic cover',
    );
  });

  it('omits the Authorization header when no session token is available', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true, data: { urls: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadChapterImages([makeFile('a.png')], 'comic-1');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['x-r2-bucket']).toBe('chapters');
  });

  it('omits chapterNumber=0 from the FormData (falsy guard skips zero chapter)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true, data: { urls: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadChapterImages([makeFile('a.png')], 'comic-1', 0);

    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(body.get('chapterNumber')).toBeNull();
    expect(body.get('comicId')).toBe('comic-1');
  });
});
