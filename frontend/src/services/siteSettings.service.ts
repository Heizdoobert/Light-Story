import { getServerSupabase } from '@/lib/supabase/server';
import { ALLOWED_AD_SETTING_KEYS, buildDefaultAdRows, isAllowedAdSettingKey } from '@/lib/adPolicy';

export type SiteSettingRow = { key: string; value: unknown };

export async function getAdSettings(): Promise<SiteSettingRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Server supabase client not available');
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [...ALLOWED_AD_SETTING_KEYS]);
  if (error) throw error;

  const rows = (data ?? []) as SiteSettingRow[];
  if (rows.length > 0) {
    return rows;
  }

  return buildDefaultAdRows();
}

export async function upsertAdSetting(key: string, value: unknown) {
  if (!isAllowedAdSettingKey(key)) {
    throw new Error('Unsupported ad setting key');
  }

  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Server supabase client not available');
  const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
  return true;
}
