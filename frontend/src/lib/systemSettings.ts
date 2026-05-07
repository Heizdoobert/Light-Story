// Centralized keys, defaults, and parsers for system settings persisted in site_settings.
import { UserRole } from '../modules/auth/AuthContext';
import { ADMIN_MENU_IDS, AdminMenuId } from './adminNavigation';

export const SITE_SETTING_KEYS = {
  uiCompactMode: 'ui_compact_mode',
  uiShowSyncBadge: 'ui_show_sync_badge',
  dashboardTabVisibility: 'dashboard_tab_visibility',
  sidebarMenuVisibility: 'sidebar_menu_visibility',
} as const;

export const DASHBOARD_CONFIGURABLE_TABS = [
  'dashboard',
  'dashboard_access_logs',
  'audit_logs',
  'operations',
  'operations_data',
  'create_story',
  'stories',
  'create_chapter',
  'categories',
  'authors',
  'ads',
  'profile',
  'create_comic',
] as const;

export type DashboardTabId = (typeof DASHBOARD_CONFIGURABLE_TABS)[number];

export type DashboardTabVisibility = Record<UserRole, DashboardTabId[]>;

export type SidebarMenuVisibility = Record<UserRole, AdminMenuId[]>;

export const DEFAULT_DASHBOARD_TAB_VISIBILITY: DashboardTabVisibility = {
  superadmin: [...DASHBOARD_CONFIGURABLE_TABS],
  admin: ['dashboard', 'dashboard_access_logs', 'operations', 'operations_data', 'create_story', 'stories', 'create_chapter', 'categories', 'authors', 'ads', 'profile', 'create_comic'],
  employee: ['dashboard', 'operations', 'operations_data', 'create_story', 'stories', 'create_chapter', 'categories', 'authors', 'profile', 'create_comic'],
  user: ['dashboard', 'stories', 'profile'],
};

export const DEFAULT_SIDEBAR_MENU_VISIBILITY: SidebarMenuVisibility = {
  superadmin: [...ADMIN_MENU_IDS],
  admin: ['dashboard', 'operations', 'operations_data', 'create_story', 'stories', 'categories', 'authors', 'ads', 'profile', 'create_comic'],
  employee: ['dashboard', 'operations', 'operations_data', 'create_story', 'stories', 'categories', 'authors', 'profile', 'create_comic'],
  user: [],
};

const isDashboardTabId = (value: string): value is DashboardTabId =>
  (DASHBOARD_CONFIGURABLE_TABS as readonly string[]).includes(value);

const isAdminMenuId = (value: string): value is AdminMenuId =>
  (ADMIN_MENU_IDS as readonly string[]).includes(value);

const tryParseJson = (value: unknown): unknown => {
  let next: unknown = value;

  for (let depth = 0; depth < 2; depth += 1) {
    if (typeof next !== 'string') return next;

    const trimmed = next.trim();
    if (!trimmed) return next;

    try {
      next = JSON.parse(trimmed);
    } catch {
      return next;
    }
  }

  return next;
};

export const parseBooleanSetting = (value: unknown, fallback: boolean): boolean => {
  const parsed = tryParseJson(value);
  if (typeof parsed === 'boolean') return parsed;
  if (typeof parsed === 'string') {
    const normalized = parsed.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
};

export const parseDashboardTabVisibility = (
  raw: unknown,
  fallback: DashboardTabVisibility = DEFAULT_DASHBOARD_TAB_VISIBILITY,
): DashboardTabVisibility => {
  const parsed = tryParseJson(raw);
  if (!parsed || typeof parsed !== 'object') return fallback;

  const source = parsed as Record<string, unknown>;
  const next: DashboardTabVisibility = {
    superadmin: [...fallback.superadmin],
    admin: [...fallback.admin],
    employee: [...fallback.employee],
    user: [...fallback.user],
  };

  (['superadmin', 'admin', 'employee', 'user'] as const).forEach((role) => {
    const incoming = source[role];
    if (!Array.isArray(incoming)) return;

    const filtered = incoming
      .map((item) => String(item))
      .filter(isDashboardTabId);

    if (filtered.length > 0) {
      next[role] = Array.from(new Set([...fallback[role], ...filtered]));
    }
  });

  return next;
};

export const parseSidebarMenuVisibility = (
  raw: unknown,
  fallback: SidebarMenuVisibility = DEFAULT_SIDEBAR_MENU_VISIBILITY,
): SidebarMenuVisibility => {
  const parsed = tryParseJson(raw);
  if (!parsed || typeof parsed !== 'object') return fallback;

  const source = parsed as Record<string, unknown>;
  const next: SidebarMenuVisibility = {
    superadmin: [...fallback.superadmin],
    admin: [...fallback.admin],
    employee: [...fallback.employee],
    user: [...fallback.user],
  };

  (['superadmin', 'admin', 'employee', 'user'] as const).forEach((role) => {
    const incoming = source[role];
    if (!Array.isArray(incoming)) return;

    const filtered = incoming
      .map((item) => String(item))
      .filter(isAdminMenuId);

    if (filtered.length > 0) {
      next[role] = Array.from(new Set([...fallback[role], ...filtered]));
    }
  });

  return next;
};

export const getRoleVisibleTabs = (
  visibility: DashboardTabVisibility,
  role: keyof DashboardTabVisibility,
): DashboardTabId[] => {
  const maybeTabs = visibility[role];
  if (!Array.isArray(maybeTabs)) {
    return [...DEFAULT_DASHBOARD_TAB_VISIBILITY[role]];
  }

  const filtered = maybeTabs.filter(isDashboardTabId);
  return filtered.length > 0 ? filtered : [...DEFAULT_DASHBOARD_TAB_VISIBILITY[role]];
};

export const isDashboardTabVisibleForRole = (
  tabId: string,
  role: UserRole,
  visibility: DashboardTabVisibility,
): boolean => {
  if (role === 'superadmin') return true;
  return visibility[role]?.includes(tabId as DashboardTabId) ?? false;
};

export const isAdminMenuVisibleForRole = (
  menuId: string,
  role: UserRole,
  visibility: SidebarMenuVisibility,
): boolean => {
  if (role === 'superadmin') return true;
  return visibility[role]?.includes(menuId as AdminMenuId) ?? false;
};
