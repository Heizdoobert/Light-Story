import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const body = await req.json();
  const storyId = body.storyId || body.story_id;
  if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });

  const { error } = await supabase.rpc('like_story', { story_id: storyId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
