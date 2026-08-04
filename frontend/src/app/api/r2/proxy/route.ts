import { NextResponse } from 'next/server';
import { getBucketForFolder, getObject } from '@/lib/r2/s3';

function guessContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'webp':
      return 'image/webp';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'avif':
      return 'image/avif';
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') ?? '';
  const folder = searchParams.get('folder') ?? 'chapters';

  if (!key) {
    return new NextResponse('Missing key', { status: 400 });
  }

  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
    return new NextResponse('Invalid key', { status: 400 });
  }

  const bucket = getBucketForFolder(folder);
  if (!bucket) {
    return new NextResponse('Storage not configured', { status: 500 });
  }

  try {
    const { body, contentType } = await getObject(bucket, key);
    if (!body) {
      return new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(new Blob([new Uint8Array(body)]), {
      headers: {
        'Content-Type': contentType || guessContentType(key),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return new NextResponse('Error fetching object', { status: 500 });
  }
}