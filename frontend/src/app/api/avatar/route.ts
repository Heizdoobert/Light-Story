import { NextResponse } from 'next/server';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB ceiling for avatar images

/**
 * GET /api/avatar?url=...
 * Proxies Supabase Storage avatar images with immutable cache headers.
 * Validates URL origin strictly to prevent SSRF attacks.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Strict origin validation to prevent SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const isValidSupabaseAvatar =
    parsedUrl.hostname.endsWith('.supabase.co') &&
    parsedUrl.pathname.startsWith('/storage/v1/object/public/avatars/');

  if (!isValidSupabaseAvatar) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  try {
    const response = await fetch(parsedUrl.toString(), { redirect: 'manual' });
    if (response.redirected || response.type === 'opaqueredirect') {
      return NextResponse.json({ error: 'Redirects not allowed' }, { status: 400 });
    }
    if (response.status >= 300 && response.status < 400) {
      console.error(`[Avatar Proxy] Upstream redirect ${response.status} for ${parsedUrl.pathname}`);
      return NextResponse.json({ error: 'Upstream redirect not allowed' }, { status: 502 });
    }
    if (!response.ok) {
      console.error(`[Avatar Proxy] Upstream returned ${response.status} for ${parsedUrl.pathname}`);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';

    // Validate that upstream returns an image
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream returned non-image content' }, { status: 502 });
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'Image exceeds size limit' }, { status: 503 });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Avatar Proxy] Error:', error);
    return NextResponse.json({ error: 'Error fetching image' }, { status: 500 });
  }
}
