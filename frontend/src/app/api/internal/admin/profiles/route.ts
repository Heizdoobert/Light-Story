import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

async function getRequester(request: Request) {
  const internalSecret = request.headers.get('x-internal-secret');
  if (internalSecret && process.env.INTERNAL_ADMIN_SECRET && internalSecret === process.env.INTERNAL_ADMIN_SECRET) {
    return { ok: true, role: 'internal' };
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { ok: false };

  try {
    const parts = token.split('.');
    if (parts.length < 2) return { ok: false };
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    const userId = payload.sub || payload.user_id || payload?.sub;
    if (!userId) return { ok: false };

    const supabase = getServerSupabase();
    if (!supabase) return { ok: false };
    const { data } = await supabase.from('profiles').select('id,role').eq('id', userId).single();
    if (!data) return { ok: false };
    return { ok: true, id: userId, role: data.role };
  } catch (e) {
    return { ok: false };
  }
}

export async function GET(request: Request) {
  const supRequester = await getRequester(request);
  if (!supRequester.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const ids = url.searchParams.get('ids');
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ data: [] });
    if (ids) {
      const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
      const { data, error } = await supabase.from('profiles').select('id,email,full_name').in('id', idList);
      if (error) throw error;
      return NextResponse.json({ data });
    }

    const { data, error } = await supabase.from('profiles').select('id,email,role,full_name').order('role', { ascending: true }).limit(500);
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supRequester = await getRequester(request);
  if (!supRequester.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, id, role, full_name } = body as any;
    if (!id || !action) return NextResponse.json({ error: 'invalid' }, { status: 400 });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: 'server-supabase-missing' }, { status: 500 });

    if (action === 'updateRole') {
      // Only superadmin can change roles
      if (supRequester.role !== 'superadmin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'updateName') {
      const { error } = await supabase.from('profiles').update({ full_name }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}
