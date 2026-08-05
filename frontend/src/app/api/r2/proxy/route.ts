import { NextResponse } from 'next/server';
import { getBucketForFolder, getObject } from '@/lib/r2/s3';

const ALLOWED_FOLDERS = new Set(['chapters', 'covers', 'avatars']);

function guessContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    webp: 'image/webp',
    png: 'image/png',
    gif: 'image/gif',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * GET /api/r2/proxy?key=...&folder=...
 * Proxies R2 storage objects (chapter images, covers) with cache headers.
 * Validates key to prevent directory traversal and folder to allowed set.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') ?? '';
  const folder = searchParams.get('folder') ?? 'chapters';

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  // Prevent directory traversal and invalid keys
  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  // Validate folder
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
  }

  const bucket = getBucketForFolder(folder);
  if (!bucket) {
    console.error('[R2 Proxy] Storage not configured for folder:', folder);
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { body, contentType } = await getObject(bucket, key);
    if (!body) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    return new NextResponse(Buffer.from(body), {
      headers: {
        'Content-Type': contentType || guessContentType(key),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[R2 Proxy] Error fetching object:', error);
    return NextResponse.json({ error: 'Error fetching object' }, { status: 500 });
  }
}