import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });
  const body = await req.json();
  const { action, story, id, payload, ids, status } = body;

  try {
    if (action === 'update') {
      const { data, error } = await supabase.from('stories').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return NextResponse.json({ story: data });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('stories').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'bulkUpdateStatus') {
      const { error } = await supabase.from('stories').update({ status }).in('id', ids);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'bulkDelete') {
      const { error } = await supabase.from('stories').delete().in('id', ids);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // default: create
    if (story) {
      const { data, error } = await supabase.from('stories').insert([story]).select('*').single();
      if (error) throw error;
      return NextResponse.json({ story: data });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
