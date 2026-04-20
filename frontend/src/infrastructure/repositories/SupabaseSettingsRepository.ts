import { supabase } from '../../core/supabase';
import { SiteSetting } from '../../domain/entities';
import { ISettingsRepository } from '../../domain/repositories';

export class SupabaseSettingsRepository implements ISettingsRepository {
  async getSettingByKey(key: string): Promise<SiteSetting | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('site_settings').select('*').eq('key', key).single();
    if (error) return null;
    return data;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  }
}
