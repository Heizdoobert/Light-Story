import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ data: [] });
    const { data, error } = await supabase.from('profiles').select('role');
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const r = (row as any).role || 'user';
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    const out = Array.from(counts.entries()).map(([role, total]) => ({ role, total })).sort((a, b) => b.total - a.total);
    return NextResponse.json({ data: out });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}
