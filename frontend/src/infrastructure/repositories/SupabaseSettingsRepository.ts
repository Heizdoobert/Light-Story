/**
 * Infrastructure Layer - Supabase Settings Repository
 * Implements the ISettingsRepository interface for data persistence
 */

import { getServerSupabase } from '@/lib/supabase/server';
import { SiteSetting } from '@/types/entities';
import { ISettingsRepository } from '@/domain/interfaces';

export class SupabaseSettingsRepository implements ISettingsRepository {
  async getSettingByKey(key: string): Promise<SiteSetting | null> {
    const supabase = getServerSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.from('site_settings').select('*').eq('key', key).single();
    if (error) throw error;
    return data;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const supabase = getServerSupabase();
    if (!supabase) throw new Error('Server supabase client not available');
    const { error } = await supabase
      .from('site_settings')
      .update({ value })
      .eq('key', key);
    if (error) throw error;
  }
}

export default SupabaseSettingsRepository;
