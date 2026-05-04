import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(_request: Request) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ hasSession: false });
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const hasSession = Boolean(data.session?.user);
    return NextResponse.json({ hasSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}
