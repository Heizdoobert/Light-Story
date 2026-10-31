import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayClient } from '../index';
import { StorageManager, DEFAULT_MAX_FILE_SIZE } from '../storage/storage-manager';

describe('StorageManager SDK', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Validation & Key Utilities', () => {
    it('validates file size within threshold', () => {
      const client = new GatewayClient({ baseUrl });
      const storage = client.storage;

      expect(storage.validate({ size: 1024, name: 'cover.jpg', type: 'image/jpeg' }).valid).toBe(true);
      expect(storage.validate({ size: 0 }).valid).toBe(false);
      expect(storage.validate({ size: DEFAULT_MAX_FILE_SIZE + 1 }).valid).toBe(false);
    });

    it('rejects disallowed file extensions and missing extensions', () => {
      const client = new GatewayClient({ baseUrl });
      const storage = client.storage;

      expect(storage.validate({ size: 100, name: 'script.exe' }).valid).toBe(false);
      expect(storage.validate({ size: 100, name: 'script_without_ext' }).valid).toBe(false);
      expect(storage.validate({ size: 100, name: 'chapter1.cbz' }).valid).toBe(true);
      expect(storage.validate({ size: 100, name: 'image.webp' }).valid).toBe(true);
      expect(storage.validate({ size: 100, name: 'payload.php\0.png' }).valid).toBe(false);
      expect(storage.validate({ size: NaN, name: 'image.png' }).valid).toBe(false);
      expect(
        storage.validate({ size: 100, name: 'image.png' }, { allowedExtensions: ['.png', 'JPG'] }).valid,
      ).toBe(true);
      expect(
        storage.validate({ size: 100, name: 'IMAGE.PNG' }, { allowedExtensions: ['png'] }).valid,
      ).toBe(true);
    });

    it('sanitizes path traversal from folders and keys', () => {
      const client = new GatewayClient({ baseUrl });
      const storage = client.storage;

      const traversalKey = storage.generateKey('../../etc', 'test.png');
      expect(traversalKey.startsWith('etc/')).toBe(true);
      expect(traversalKey).not.toContain('..');

      const parsed = storage.parseKey('../../sensitive/secret.png');
      expect(parsed.folder).toBe('sensitive');
      expect(parsed.filename).toBe('secret.png');

      const multiDotKey = client.storage.parseKey('chapters/....//etc/passwd.jpg');
      expect(multiDotKey.folder).toBe('chapters');
      expect(multiDotKey.filename).toBe('etc/passwd.jpg');
    });

    it('parses storage keys accurately', () => {
      const client = new GatewayClient({ baseUrl });
      const info = client.storage.parseKey('chapters/comic-1/100-page.webp');

      expect(info.folder).toBe('chapters');
      expect(info.filename).toBe('comic-1/100-page.webp');
      expect(info.extension).toBe('webp');
      expect(info.isArchive).toBe(false);

      const archiveInfo = client.storage.parseKey('chapters/comic-1.cbz');
      expect(archiveInfo.isArchive).toBe(true);
      expect(archiveInfo.extension).toBe('cbz');
    });

    it('generates consistent, safe storage keys', () => {
      const client = new GatewayClient({ baseUrl });
      const key = client.storage.generateKey('covers', 'my-cover.png');

      expect(key.startsWith('covers/')).toBe(true);
      expect(key.endsWith('.png')).toBe(true);
    });
  });

  describe('Upload Operations', () => {
    it('uploads a file blob successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              key: 'covers/test-cover.webp',
              url: 'covers/test-cover.webp',
              size: 2048,
              contentType: 'image/webp',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const blob = new Blob(['fake image content'], { type: 'image/webp' });

      const result = await client.storage.upload(blob, {
        folder: 'covers',
        filename: 'test-cover.webp',
      });

      expect(result.success).toBe(true);
      expect(result.key).toBe('covers/test-cover.webp');
      expect(result.publicUrl).toBe('https://api.light-story.test/api/media/covers%2Ftest-cover.webp');
      expect(result.fileUrl).toBe('https://api.light-story.test/api/admin/r2/file/covers%2Ftest-cover.webp');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/admin/r2/upload',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws validation error when file violates constraints', async () => {
      const client = new GatewayClient({ baseUrl });
      const emptyBlob = new Blob([], { type: 'image/jpeg' });

      await expect(client.storage.upload(emptyBlob, { folder: 'covers' })).rejects.toThrow(
        /Validation error/,
      );
    });

    it('handles batch upload with progress reporting and partial failure handling', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: { key: 'chapters/p1.webp', url: 'chapters/p1.webp' },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: false,
              error: { message: 'Quota exceeded' },
            }),
            { status: 500, headers: { 'content-type': 'application/json' } },
          ),
        );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const progressList: number[] = [];

      const batch = await client.storage.uploadBatch(
        [
          { file: new Blob(['p1'], { type: 'image/webp' }), options: { filename: 'p1.webp' } },
          { file: new Blob(['p2'], { type: 'image/webp' }), options: { filename: 'p2.webp' } },
        ],
        {
          concurrency: 1,
          onProgress: (p) => progressList.push(p.completed),
        },
      );

      expect(batch.total).toBe(2);
      expect(batch.successful.length).toBe(1);
      expect(batch.failed.length).toBe(1);
      expect(batch.successful[0].key).toBe('chapters/p1.webp');
      expect(progressList).toEqual([1, 2]);
    });
  });

  describe('Management & Query Operations', () => {
    it('requests signed URLs via getSignedUrl', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { signedUrl: 'https://r2.storage/signed-url', expires: 1800 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.storage.getSignedUrl('covers/1.png', { expiresInSeconds: 1800 });

      expect(res.signedUrl).toBe('https://r2.storage/signed-url');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/admin/r2/signed-url',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'covers/1.png', expires: 1800 }),
        }),
      );

      await expect(client.storage.getSignedUrl('../../..')).rejects.toThrow(
        '[StorageManager] Key cannot be empty after sanitization.',
      );

      // Falls back to safe default if NaN passed
      await client.storage.getSignedUrl('covers/1.png', { expiresInSeconds: NaN });
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api.light-story.test/api/admin/r2/signed-url',
        expect.objectContaining({
          body: JSON.stringify({ key: 'covers/1.png', expires: 3600 }),
        }),
      );
    });

    it('lists files with folder prepended', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { objects: [{ key: 'covers/a.webp', size: 100, uploaded: '2026-01-01' }] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const list = await client.storage.listFiles({ folder: 'covers', limit: 10 });

      expect(list.objects.length).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/admin/r2/list?prefix=covers%2F&limit=10',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('deletes single and batch objects', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ success: true, data: { success: true, deletedCount: 2 } }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const deletedSingle = await client.storage.delete('covers/old.png');
      expect(deletedSingle).toBe(true);

      const deletedBatch = await client.storage.deleteBatch(['covers/1.png', 'covers/2.png']);
      expect(deletedBatch.success).toBe(true);
      expect(deletedBatch.deletedCount).toBe(2);
    });
  });
});
