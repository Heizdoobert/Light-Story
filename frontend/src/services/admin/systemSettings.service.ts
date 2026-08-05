import {
  DEFAULT_DASHBOARD_TAB_VISIBILITY,
  DEFAULT_SIDEBAR_MENU_VISIBILITY,
  parseBooleanSetting,
  parseDashboardTabVisibility,
  parseSidebarMenuVisibility,
  SITE_SETTING_KEYS,
  type DashboardTabVisibility,
  type SidebarMenuVisibility,
} from '@/lib/admin/systemSettings';
import { SiteSettingDto } from '@/types/dto';
import { apiClient } from '@/lib/api/apiClient';

const SETTINGS_KEYS = [
  SITE_SETTING_KEYS.uiCompactMode,
  SITE_SETTING_KEYS.uiShowSyncBadge,
  SITE_SETTING_KEYS.dashboardTabVisibility,
  SITE_SETTING_KEYS.sidebarMenuVisibility,
] as const;

const toRows = (input: unknown): SiteSettingDto[] => {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item) => item && typeof item === 'object' && 'key' in item)
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        key: String(row.key ?? ''),
        value: row.value,
      };
    })
    .filter((row) => row.key.length > 0);
};

export async function fetchSystemSettingsSnapshot(): Promise<{
  compactMode: boolean;
  showSyncBadge: boolean;
  dashboardTabVisibility: DashboardTabVisibility;
  sidebarMenuVisibility: SidebarMenuVisibility;
}> {
  try {
    const keysParam = SETTINGS_KEYS.join(',');
    const rows = toRows(
      await apiClient.get<SiteSettingDto[]>(`/api/admin/site-settings?keys=${encodeURIComponent(keysParam)}`).catch(() => null),
    );
    const map = new Map(rows.map((item) => [item.key, item.value]));

    return {
      compactMode: parseBooleanSetting(map.get(SITE_SETTING_KEYS.uiCompactMode), false),
      showSyncBadge: parseBooleanSetting(map.get(SITE_SETTING_KEYS.uiShowSyncBadge), true),
      dashboardTabVisibility: parseDashboardTabVisibility(
        map.get(SITE_SETTING_KEYS.dashboardTabVisibility),
        DEFAULT_DASHBOARD_TAB_VISIBILITY,
      ),
      sidebarMenuVisibility: parseSidebarMenuVisibility(
        map.get(SITE_SETTING_KEYS.sidebarMenuVisibility),
        DEFAULT_SIDEBAR_MENU_VISIBILITY,
      ),
    };
  } catch {
    return {
      compactMode: false,
      showSyncBadge: true,
      dashboardTabVisibility: DEFAULT_DASHBOARD_TAB_VISIBILITY,
      sidebarMenuVisibility: DEFAULT_SIDEBAR_MENU_VISIBILITY,
    };
  }
}
