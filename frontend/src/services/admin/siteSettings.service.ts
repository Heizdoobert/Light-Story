import { ALLOWED_AD_SETTING_KEYS, buildDefaultAdRows, isAllowedAdSettingKey } from '@/lib/admin/ad-policy';
import { ROUTES } from '@/lib/constants/routes';
import { apiClient } from '@/lib/api/apiClient';

export type SiteSettingRow = { key: string; value: unknown };

export async function getAdSettings(): Promise<SiteSettingRow[]> {
  const rows = await apiClient.get<SiteSettingRow[]>(ROUTES.API.ADMIN.SITE_SETTINGS_KEYS(ALLOWED_AD_SETTING_KEYS.join(',')));
  if (rows.length > 0) {
    return rows;
  }

  return buildDefaultAdRows();
}

export async function upsertAdSetting(key: string, value: unknown) {
  if (!isAllowedAdSettingKey(key)) {
    throw new Error('Unsupported ad setting key');
  }

  await apiClient.post(ROUTES.API.ADMIN.SITE_SETTINGS, { key, value });
  return true;
}
