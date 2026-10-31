export interface TieringFallbackOptions {
  key: string;
  gdriveFallbackUrl?: string;
  bucket?: R2Bucket;
  ctx?: ExecutionContext;
  fetchFn?: typeof fetch;
}

export interface FallbackResult {
  found: boolean;
  response?: Response;
}

/**
 * Handles on-demand fallback when an asset is missing from R2 hot cache.
 * If gdriveFallbackUrl is configured, it queries the Google Drive cold archive,
 * streams the image with long-term cache headers, and asynchronously promotes
 * the asset back into R2 via ctx.waitUntil().
 */
export async function handleTieringFallback({
  key,
  gdriveFallbackUrl,
  bucket,
  ctx,
  fetchFn = fetch,
}: TieringFallbackOptions): Promise<FallbackResult> {
  if (!gdriveFallbackUrl || !key) {
    return { found: false };
  }

  const cleanBase = gdriveFallbackUrl.replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  const targetUrl = `${cleanBase}/${cleanKey}`;

  try {
    const upstreamRes = await fetchFn(targetUrl, {
      headers: {
        'User-Agent': 'LightStory-Worker-Tiering/1.0',
        Accept: 'image/webp,image/avif,image/*,*/*',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return { found: false };
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/webp';
    const buffer = await upstreamRes.arrayBuffer();

    // Opportunistically promote to R2 hot tier asynchronously in background
    if (bucket && ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(
        bucket
          .put(cleanKey, buffer, {
            httpMetadata: {
              contentType,
              cacheControl: 'public, max-age=31536000, immutable',
            },
          })
          .catch((err: unknown) => {
            console.warn('[Tiering] Opportunistic R2 cache promotion failed:', err);
          }),
      );
    }

    const headers = new Headers();
    headers.set('content-type', contentType);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('x-storage-tier', 'cold-gdrive-fallback');
    headers.set('cross-origin-resource-policy', 'cross-origin');
    headers.set('content-length', buffer.byteLength.toString());

    return {
      found: true,
      response: new Response(buffer, {
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
