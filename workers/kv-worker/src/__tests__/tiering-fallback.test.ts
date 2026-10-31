import { describe, expect, it, vi } from 'vitest';
import { handleTieringFallback } from '../utils/tiering-fallback';

describe('handleTieringFallback', () => {
  it('returns { found: false } when gdriveFallbackUrl is not provided', async () => {
    const result = await handleTieringFallback({
      key: 'chapters/comic-1/c1/p1.webp',
      gdriveFallbackUrl: undefined,
    });
    expect(result.found).toBe(false);
  });

  it('returns { found: false } when upstream returns 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 404, statusText: 'Not Found' }),
    );

    const result = await handleTieringFallback({
      key: 'chapters/comic-1/c1/p1.webp',
      gdriveFallbackUrl: 'https://gdrive-cold.example.com',
      fetchFn: mockFetch as any,
    });

    expect(result.found).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://gdrive-cold.example.com/chapters/comic-1/c1/p1.webp',
      expect.any(Object),
    );
  });

  it('successfully returns 200 response when upstream finds the asset', async () => {
    const sampleBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(sampleBytes, {
        status: 200,
        headers: { 'content-type': 'image/webp' },
      }),
    );

    const mockPut = vi.fn().mockResolvedValue({});
    const mockWaitUntil = vi.fn();

    const mockBucket = { put: mockPut } as any;
    const mockCtx = { waitUntil: mockWaitUntil } as any;

    const result = await handleTieringFallback({
      key: '/chapters/comic-1/c1/p1.webp',
      gdriveFallbackUrl: 'https://gdrive-cold.example.com/',
      bucket: mockBucket,
      ctx: mockCtx,
      fetchFn: mockFetch as any,
    });

    expect(result.found).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.response?.status).toBe(200);
    expect(result.response?.headers.get('content-type')).toBe('image/webp');
    expect(result.response?.headers.get('x-storage-tier')).toBe('cold-gdrive-fallback');

    // Verify opportunistic cache promotion was queued
    expect(mockWaitUntil).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith(
      'chapters/comic-1/c1/p1.webp',
      expect.any(ArrayBuffer),
      expect.objectContaining({
        httpMetadata: expect.objectContaining({
          contentType: 'image/webp',
        }),
      }),
    );
  });

  it('handles fetch exceptions gracefully without crashing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

    const result = await handleTieringFallback({
      key: 'chapters/comic-1/c1/p1.webp',
      gdriveFallbackUrl: 'https://gdrive-cold.example.com',
      fetchFn: mockFetch as any,
    });

    expect(result.found).toBe(false);
  });
});
