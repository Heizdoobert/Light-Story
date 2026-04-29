import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });
  const body = await req.json();
  const { chapter, action, id } = body;

  try {
    if (action === 'update') {
      const { data, error } = await supabase.from('chapters').update(chapter).eq('id', id).select('*').single();
      if (error) throw error;
      return NextResponse.json({ chapter: data });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('chapters').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // default create
    if (chapter) {
      const { data, error } = await supabase.from('chapters').insert([chapter]).select('*').single();
      if (error) throw error;
      return NextResponse.json({ chapter: data });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
