import { NextResponse } from 'next/server';

const ALLOWED_PREFIX = '/storage/v1/object/public/avatars/';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('url');

  let url: URL;
  try {
    url = new URL(raw ?? '');
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  const isAllowed =
    url.protocol === 'https:' &&
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith(ALLOWED_PREFIX);

  if (!isAllowed) {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  try {
    const response = await fetch(url, { redirect: 'error' });
    if (!response.ok) throw new Error('Failed to fetch image');

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
