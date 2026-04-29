import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });
  const body = await req.json();
  const { entity, action, id, payload } = body;

  try {
    if (entity === 'category') {
      if (action === 'create') {
        const { data, error } = await supabase.from('categories').insert([{ name: payload.name, description: payload.description }]).select('*').single();
        if (error) throw error;
        return NextResponse.json({ data });
      }
      if (action === 'update') {
        const { data, error } = await supabase.from('categories').update({ name: payload.name, description: payload.description }).eq('id', id).select('*').single();
        if (error) throw error;
        return NextResponse.json({ data });
      }
      if (action === 'delete') {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
    }

    if (entity === 'author') {
      if (action === 'create') {
        const { data, error } = await supabase.from('authors').insert([{ name: payload.name, bio: payload.bio }]).select('*').single();
        if (error) throw error;
        return NextResponse.json({ data });
      }
      if (action === 'update') {
        const { data, error } = await supabase.from('authors').update({ name: payload.name, bio: payload.bio }).eq('id', id).select('*').single();
        if (error) throw error;
        return NextResponse.json({ data });
      }
      if (action === 'delete') {
        const { error } = await supabase.from('authors').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ error: 'unknown entity/action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
