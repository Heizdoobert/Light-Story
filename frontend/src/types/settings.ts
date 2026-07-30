import { UserRole } from '@/types/roles';
import { AdminMenuId } from '@/lib/admin/adminNavigation';

export type DashboardTabId =
  | 'dashboard'
  | 'dashboard_access_logs'
  | 'audit_logs'
  | 'operations'
  | 'operations_data'
  | 'create_story'
  | 'stories'
  | 'create_chapter'
  | 'categories'
  | 'authors'
  | 'ads'
  | 'settings'
  | 'profile'
  | 'create_comic';

export type DashboardTabVisibility = Record<UserRole, DashboardTabId[]>;
export type SidebarMenuVisibility = Record<UserRole, AdminMenuId[]>;