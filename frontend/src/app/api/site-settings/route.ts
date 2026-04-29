import { NextResponse } from 'next/server';
import { getAdSettings, upsertAdSetting } from '@/services/siteSettings.service';

export async function GET() {
  try {
    const data = await getAdSettings();
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
    await upsertAdSetting(key, value ?? null);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}
