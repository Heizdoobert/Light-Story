import { DashboardTabVisibility, SidebarMenuVisibility } from '@/lib/systemSettings';

export type SiteSettingDto = {
  key: string;
  value: unknown;
};

export type SystemSettingsSnapshotDto = {
  compactMode: boolean;
  showSyncBadge: boolean;
  dashboardTabVisibility: DashboardTabVisibility;
  sidebarMenuVisibility: SidebarMenuVisibility;
};
