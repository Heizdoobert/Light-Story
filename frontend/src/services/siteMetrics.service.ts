import { getServerSupabase } from '@/lib/supabase/server';

export async function getProfileCount(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Server supabase client not available');
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return (count as number) ?? 0;
}

export async function getChapterCount(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Server supabase client not available');
  const { count, error } = await supabase.from('chapters').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return (count as number) ?? 0;
}
