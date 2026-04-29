import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const storyId = url.searchParams.get('storyId');

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });

  try {
    if (id) {
      const { data, error } = await supabase.from('chapters').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (storyId) {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('chapter_number', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ data: data ?? [] });
    }

    return NextResponse.json({ data: [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
