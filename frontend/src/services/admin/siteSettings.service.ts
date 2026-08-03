import { ALLOWED_AD_SETTING_KEYS, buildDefaultAdRows } from '@/lib/admin/adPolicy';
import { apiClient } from '@/lib/api/apiClient';

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
