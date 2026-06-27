import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DASHBOARD_TAB_VISIBILITY as DEFAULT_TAB_VISIBILITY,
  DEFAULT_SIDEBAR_MENU_VISIBILITY,
  parseDashboardTabVisibility,
  parseSidebarMenuVisibility,
} from './systemSettings';
import { DEFAULT_ADMIN_MENU_VISIBILITY } from './adminNavigation';

describe('role visibility defaults', () => {
  it('keeps user dashboard access empty by default', () => {
    expect(DEFAULT_TAB_VISIBILITY.user).toEqual([]);
    expect(DEFAULT_SIDEBAR_MENU_VISIBILITY.user).toEqual([]);
  });

  it('exposes settings to admin defaults', () => {
    expect(DEFAULT_TAB_VISIBILITY.admin).toContain('settings');
    expect(DEFAULT_SIDEBAR_MENU_VISIBILITY.admin).toContain('settings');
    expect(DEFAULT_ADMIN_MENU_VISIBILITY.admin).toContain('settings');
  });

  it('keeps superadmin at full dashboard scope', () => {
    expect(DEFAULT_TAB_VISIBILITY.superadmin).toContain('settings');
  });

  it('drops user dashboard tabs from saved visibility payloads', () => {
    const parsed = parseDashboardTabVisibility({
      user: ['dashboard', 'stories', 'profile'],
      admin: ['settings'],
    });

    expect(parsed.user).toEqual([]);
    expect(parsed.admin).toContain('settings');
  });

  it('drops user sidebar menu items from saved visibility payloads', () => {
    const parsed = parseSidebarMenuVisibility({
      user: ['dashboard', 'settings'],
      admin: ['settings'],
    });

    expect(parsed.user).toEqual([]);
    expect(parsed.admin).toContain('settings');
  });
});
