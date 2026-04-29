import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/server';
import { getServerSupabase } from '@/lib/supabase/server';

async function getRequester(request: NextRequest) {
  const internalSecret = request.headers.get('x-internal-secret');
  if (internalSecret && process.env.INTERNAL_ADMIN_SECRET && internalSecret === process.env.INTERNAL_ADMIN_SECRET) {
    return { ok: true, role: 'internal' };
  }

  try {
    const sessionClient = await createSessionClient();
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const userId = userData.user?.id;
    if (userError || !userId) return { ok: false };

    const supabase = getServerSupabase();
    if (!supabase) return { ok: false };
    const { data } = await supabase.from('profiles').select('id,role').eq('id', userId).single();
    if (!data) return { ok: false };
    return { ok: true, id: userId, role: data.role };
  } catch {
    return { ok: false };
  }
}

export async function GET(req: NextRequest) {
  const requester = await getRequester(req);
  if (!requester.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });

  const type = req.nextUrl.searchParams.get('type');
  try {
    if (type === 'authors') {
      const { data, error } = await supabase.from('authors').select('id,name,bio,created_at,updated_at').order('name', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ data: data ?? [] });
    }

    if (type === 'categories') {
      const { data, error } = await supabase.from('categories').select('id,name,description,created_at,updated_at').order('name', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ data: data ?? [] });
    }

    return NextResponse.json({ error: 'type param required' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requester = await getRequester(req);
  if (!requester.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

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
