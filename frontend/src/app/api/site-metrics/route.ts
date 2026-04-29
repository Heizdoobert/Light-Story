import { NextResponse } from 'next/server';
import { getProfileCount, getChapterCount } from '@/services/siteMetrics.service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  try {
    if (type === 'profiles') {
      const count = await getProfileCount();
      return NextResponse.json({ count });
    }
    if (type === 'chapters') {
      const count = await getChapterCount();
      return NextResponse.json({ count });
    }
    return NextResponse.json({ error: 'type param required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}
