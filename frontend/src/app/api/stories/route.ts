import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const field = url.searchParams.get('field');
  const page = Number(url.searchParams.get('page') || '1');
  const pageSize = Number(url.searchParams.get('pageSize') || '10');
  const keyword = url.searchParams.get('keyword');
  const status = url.searchParams.get('status');
  const sort = url.searchParams.get('sort');

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });

  try {
    if (field) {
      const { data, error } = await supabase.from('stories').select(field);
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (id) {
      const { data, error } = await supabase.from('stories').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Paginated listing
    const pageSafe = Math.max(1, page);
    const pageSizeSafe = Math.min(50, Math.max(1, pageSize));
    const from = (pageSafe - 1) * pageSizeSafe;
    const to = from + pageSizeSafe - 1;

    let query = supabase.from('stories').select('*', { count: 'exact' });

    if (keyword) {
      const escaped = keyword.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%,category.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (sort === 'oldest') query = query.order('created_at', { ascending: true });
    else if (sort === 'most_viewed') query = query.order('views', { ascending: false, nullsFirst: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;
    return NextResponse.json({ items: data ?? [], total: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
