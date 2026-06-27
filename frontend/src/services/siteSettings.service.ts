import { ALLOWED_AD_SETTING_KEYS, buildDefaultAdRows, isAllowedAdSettingKey } from '@/lib/adPolicy';
import { apiClient } from '@/lib/apiClient';

export type SiteSettingRow = { key: string; value: unknown };

export async function getAdSettings(): Promise<SiteSettingRow[]> {
  const rows = await apiClient.get<SiteSettingRow[]>(
    `/api/admin/site-settings?keys=${encodeURIComponent(ALLOWED_AD_SETTING_KEYS.join(','))}`,
  );
  if (rows.length > 0) {
    return rows;
  }

  return buildDefaultAdRows();
}

export async function upsertAdSetting(key: string, value: unknown) {
  if (!isAllowedAdSettingKey(key)) {
    throw new Error('Unsupported ad setting key');
  }

  await apiClient.post('/api/admin/site-settings', { key, value });
  return true;
}
