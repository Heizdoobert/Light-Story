import {
  DEFAULT_DASHBOARD_TAB_VISIBILITY,
  DEFAULT_SIDEBAR_MENU_VISIBILITY,
  parseBooleanSetting,
  parseDashboardTabVisibility,
  parseSidebarMenuVisibility,
  SITE_SETTING_KEYS,
} from '@/lib/systemSettings';
import { SiteSettingDto, SystemSettingsSnapshotDto } from '@/types/dto';

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

export async function fetchSystemSettingsSnapshot(): Promise<SystemSettingsSnapshotDto> {
  try {
    const keysParam = SETTINGS_KEYS.join(',');
    const res = await fetch(`/api/system-settings?keys=${encodeURIComponent(keysParam)}`);
    if (!res.ok) {
      return {
        compactMode: false,
        showSyncBadge: true,
        dashboardTabVisibility: DEFAULT_DASHBOARD_TAB_VISIBILITY,
        sidebarMenuVisibility: DEFAULT_SIDEBAR_MENU_VISIBILITY,
      };
    }
    const json = await res.json();
    const rows = toRows(json.data);
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

export async function saveSystemSettingsSnapshot(snapshot: SystemSettingsSnapshotDto): Promise<void> {
  const payload = [
    { key: SITE_SETTING_KEYS.uiCompactMode, value: snapshot.compactMode },
    { key: SITE_SETTING_KEYS.uiShowSyncBadge, value: snapshot.showSyncBadge },
    { key: SITE_SETTING_KEYS.dashboardTabVisibility, value: snapshot.dashboardTabVisibility },
    { key: SITE_SETTING_KEYS.sidebarMenuVisibility, value: snapshot.sidebarMenuVisibility },
  ];

  const res = await fetch('/api/system-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw new Error('Request failed');
}
