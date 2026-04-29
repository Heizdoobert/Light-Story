import { getServerSupabase } from '@/lib/supabase/server';

export type SiteSettingRow = { key: string; value: string | null };

export async function getAdSettings(): Promise<SiteSettingRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Server supabase client not available');
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['ad_header', 'ad_middle', 'ad_sidebar']);
  if (error) throw error;
  return (data ?? []) as SiteSettingRow[];
}

export async function upsertAdSetting(key: string, value: string | null) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Server supabase client not available');
  const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
  return true;
}
