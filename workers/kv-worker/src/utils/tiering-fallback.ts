import { createUnmaskTransformStream } from './cbz-obfuscation';

export interface TieringFallbackOptions {
  key: string;
  gdriveFallbackUrl?: string;
  bucket?: R2Bucket;
  ctx?: ExecutionContext;
  fetchFn?: typeof fetch;
  isMasked?: boolean;
}

export interface FallbackResult {
  found: boolean;
  response?: Response;
}

/**
 * Handles on-demand fallback when an asset is missing from R2 hot cache.
 * If gdriveFallbackUrl is configured, it queries the Google Drive cold archive,
 * applies zero-buffer streaming with ReadableStream.tee(), optionally de-obfuscates
 * magic bytes on-the-fly, and asynchronously promotes the asset back into R2 via ctx.waitUntil().
 */
export async function handleTieringFallback({
  key,
  gdriveFallbackUrl,
  bucket,
  ctx,
  fetchFn = fetch,
  isMasked = false,
}: TieringFallbackOptions): Promise<FallbackResult> {
  if (!gdriveFallbackUrl || !key) {
    return { found: false };
  }

  const cleanBase = gdriveFallbackUrl.replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  const targetUrl = `${cleanBase}/${cleanKey}`;

  try {
    const upstreamRes = await fetchFn(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'LightStory-Worker-Tiering/1.0',
        Accept: 'image/webp,image/avif,image/*,application/zip,application/octet-stream,*/*',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return { found: false };
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/webp';

    // Anti-Cache Poisoning: Reject HTML/JSON error pages from upstream (e.g. quota/login pages)
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      console.warn('[Tiering] Upstream returned non-media content type:', {
        key: cleanKey,
        contentType,
      });
      return { found: false };
    }

    // Zero-buffer stream splitting via ReadableStream.tee()
    const [streamToClient, streamToR2] = upstreamRes.body.tee();

    // If upstream file was XOR-masked, unmask the 32-byte header on-the-fly
    const clientBody = isMasked
      ? streamToClient.pipeThrough(createUnmaskTransformStream())
      : streamToClient;
    const r2Body = isMasked
      ? streamToR2.pipeThrough(createUnmaskTransformStream())
      : streamToR2;

    // Opportunistically promote to R2 warm tier asynchronously in background without RAM buffering
    if (bucket && ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(
        bucket
          .put(cleanKey, r2Body, {
            httpMetadata: {
              contentType,
              cacheControl: 'public, max-age=1209600, immutable', // 14 days LRU warm store
            },
          })
          .catch((err: unknown) => {
            console.warn('[Tiering] Opportunistic R2 cache promotion failed:', err);
          }),
      );
    }

    const headers = new Headers();
    headers.set('content-type', contentType);
    headers.set('cache-control', 'public, max-age=1209600, immutable');
    headers.set('x-storage-tier', 'cold-gdrive-fallback');
    headers.set('cross-origin-resource-policy', 'same-origin');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      headers.set('content-length', contentLength);
    }

    return {
      found: true,
      response: new Response(clientBody, {
        status: 200,
        headers,
      }),
    };
  } catch (err) {
    console.error('[Tiering] Google Drive fallback fetch error:', {
      key: cleanKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return { found: false };
  }
}
