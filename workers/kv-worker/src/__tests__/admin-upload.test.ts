import { describe, expect, it, vi } from 'vitest';
import { handleAdminRequest } from '../routes/admin';

describe('/admin/r2/upload streaming', () => {
  it('streams file using file.stream() when available without buffering arrayBuffer', async () => {
    let putKey = '';
    let putValue: any = null;
    let putOpts: any = null;

    const mockBucket = {
      put: vi.fn(async (key: string, value: any, opts: any) => {
        putKey = key;
        putValue = value;
        putOpts = opts;
      }),
    };

    const env = {
      R2_BUCKET: mockBucket,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    } as unknown as Env;

    const realFile = new File([new Uint8Array([1, 2, 3, 4])], 'avatar.png', { type: 'image/png' });
    const originalStream = realFile.stream.bind(realFile);
    let streamCalled = false;
    (realFile as any).stream = () => {
      streamCalled = true;
      return originalStream();
    };
    const arrayBufferSpy = vi.spyOn(realFile, 'arrayBuffer');

    const formData = new FormData();
    formData.append('file', realFile);
    formData.append('folder', 'avatars');

    const req = new Request('https://gateway.test/api/admin/r2/upload', {
      method: 'POST',
      headers: {
        'x-user-role': 'admin',
        'x-user-id': 'user-123',
      },
      body: formData,
    });

    const res = await handleAdminRequest(req, env, null, '/admin/r2/upload');
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;
    expect(body).toEqual({
      success: true,
      data: { urls: ['/api/media/avatars/user-123.png'] },
    });

    expect(mockBucket.put).toHaveBeenCalledTimes(1);
    expect(putKey).toBe('avatars/user-123.png');
    expect(streamCalled).toBe(true);
    expect(putValue).toBeInstanceOf(ReadableStream);
    expect(arrayBufferSpy).not.toHaveBeenCalled();
    expect(putOpts?.httpMetadata?.contentType).toBe('image/png');
    expect(putOpts?.httpMetadata?.cacheControl).toBe('public, max-age=31536000, immutable');
  });

  it('falls back to file.arrayBuffer() when file.stream is not a function', async () => {
    let putValue: any = null;

    const mockBucket = {
      put: vi.fn(async (_key: string, value: any, _opts: any) => {
        putValue = value;
      }),
    };

    const env = {
      R2_BUCKET: mockBucket,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    } as unknown as Env;

    const buffer = new Uint8Array([5, 6, 7, 8]).buffer;
    const mockFileWithoutStream = {
      name: 'cover.jpg',
      type: 'image/jpeg',
      size: 4,
      arrayBuffer: vi.fn(async () => buffer),
    };

    const req = new Request('https://gateway.test/api/admin/r2/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=test',
        'x-user-role': 'admin',
        'x-user-id': 'user-123',
      },
      body: 'mock-body',
    });
    req.formData = async () => ({
      getAll: (key: string) => (key === 'file' ? [mockFileWithoutStream] : []),
      get: (key: string) => (key === 'folder' ? 'covers' : null),
    } as any);

    const res = await handleAdminRequest(req, env, null, '/admin/r2/upload');
    expect(res?.status).toBe(200);
    expect(mockBucket.put).toHaveBeenCalledTimes(1);
    expect(mockFileWithoutStream.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(putValue).toBe(buffer);
  });

  it('uploads multiple chapter images with bounded worker pool preserving index order', async () => {
    let activeUploads = 0;
    let maxConcurrentUploads = 0;

    const mockBucket = {
      put: vi.fn(async (_key: string, _value: any, _opts: any) => {
        activeUploads++;
        if (activeUploads > maxConcurrentUploads) {
          maxConcurrentUploads = activeUploads;
        }
        await new Promise((resolve) => setTimeout(resolve, 15));
        activeUploads--;
      }),
    };

    const env = {
      R2_BUCKET: mockBucket,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    } as unknown as Env;

    const files = Array.from({ length: 8 }, (_, i) => ({
      name: `page-${i + 1}.webp`,
      type: 'image/webp',
      size: 10,
      stream: () => new ReadableStream(),
    }));

    const req = new Request('https://gateway.test/api/admin/r2/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=test',
        'x-user-role': 'admin',
        'x-user-id': 'user-123',
      },
      body: 'mock-body',
    });
    req.formData = async () => ({
      getAll: (key: string) => {
        if (key === 'file') return files;
        if (key === 'pageNumber') return files.map((_, i) => String(i + 1));
        return [];
      },
      get: (key: string) => {
        if (key === 'folder') return 'chapters';
        if (key === 'comicId') return 'comic-abc';
        if (key === 'chapterNumber') return '1';
        return null;
      },
    } as any);

    const res = await handleAdminRequest(req, env, null, '/admin/r2/upload');
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as any;

    expect(mockBucket.put).toHaveBeenCalledTimes(8);
    expect(maxConcurrentUploads).toBeLessThanOrEqual(4);
    expect(maxConcurrentUploads).toBeGreaterThan(1);
    expect(body.data.urls).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(body.data.urls[i]).toMatch(new RegExp(`^/api/media/chapters/comic-abc/chapter-1/page-${i + 1}-[0-9a-f]{8}\\.webp$`));
    }
  });
});
