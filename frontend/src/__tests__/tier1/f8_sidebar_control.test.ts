import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SIDEBAR_CONTROL,
  parseSidebarControl,
  isSidebarEnabledForRole,
  isCategoryMenuVisibleForRole,
  type SidebarControl,
} from '@/lib/admin/sidebar-settings';

describe('F8 sidebar control', () => {
  describe('parseSidebarControl', () => {
    it('returns defaults for null, non-object and garbage input', () => {
      expect(parseSidebarControl(null)).toEqual(DEFAULT_SIDEBAR_CONTROL);
      expect(parseSidebarControl('not-json')).toEqual(DEFAULT_SIDEBAR_CONTROL);
      expect(parseSidebarControl(42)).toEqual(DEFAULT_SIDEBAR_CONTROL);
      expect(parseSidebarControl('{"broken":')).toEqual(DEFAULT_SIDEBAR_CONTROL);
    });

    it('parses double-encoded JSON strings', () => {
      const raw = JSON.stringify(JSON.stringify({ sidebarEnabled: { admin: false } }));
      const control = parseSidebarControl(raw);
      expect(control.sidebarEnabled.admin).toBe(false);
      expect(control.sidebarEnabled.employee).toBe(true);
    });

    it('merges partial role maps with defaults, non-boolean values fall back', () => {
      const control = parseSidebarControl({
        sidebarEnabled: { admin: false, employee: 'yes' },
        categoriesVisible: { admin: false },
      });
      expect(control.sidebarEnabled.admin).toBe(false);
      expect(control.sidebarEnabled.employee).toBe(true);
      expect(control.categoriesVisible.admin).toBe(false);
      expect(control.categoriesVisible.employee).toBe(true);
    });

    it('round-trips a full custom control', () => {
      const custom: SidebarControl = {
        sidebarEnabled: { admin: false, employee: true },
        categoriesVisible: { admin: true, employee: false },
      };
      expect(parseSidebarControl(JSON.stringify(custom))).toEqual(custom);
    });
  });

  describe('isSidebarEnabledForRole', () => {
    it('superadmin always sees the sidebar regardless of settings', () => {
      const control = parseSidebarControl({ sidebarEnabled: { admin: false } });
      expect(isSidebarEnabledForRole(control, 'superadmin')).toBe(true);
    });

    it('null, user and internal roles never see the sidebar', () => {
      expect(isSidebarEnabledForRole(DEFAULT_SIDEBAR_CONTROL, null)).toBe(false);
      expect(isSidebarEnabledForRole(DEFAULT_SIDEBAR_CONTROL, 'user')).toBe(false);
      expect(isSidebarEnabledForRole(DEFAULT_SIDEBAR_CONTROL, 'internal')).toBe(false);
    });

    it('honors per-role toggle', () => {
      const control = parseSidebarControl({ sidebarEnabled: { admin: false } });
      expect(isSidebarEnabledForRole(control, 'admin')).toBe(false);
      expect(isSidebarEnabledForRole(control, 'employee')).toBe(true);
    });
  });

  describe('isCategoryMenuVisibleForRole', () => {
    it('superadmin always sees the categories menu', () => {
      const control = parseSidebarControl({ categoriesVisible: { admin: false } });
      expect(isCategoryMenuVisibleForRole(control, 'superadmin')).toBe(true);
    });

    it('null, user and internal roles never see the categories menu', () => {
      expect(isCategoryMenuVisibleForRole(DEFAULT_SIDEBAR_CONTROL, null)).toBe(false);
      expect(isCategoryMenuVisibleForRole(DEFAULT_SIDEBAR_CONTROL, 'user')).toBe(false);
      expect(isCategoryMenuVisibleForRole(DEFAULT_SIDEBAR_CONTROL, 'internal')).toBe(false);
    });

    it('honors per-role toggle', () => {
      const control = parseSidebarControl({ categoriesVisible: { employee: false } });
      expect(isCategoryMenuVisibleForRole(control, 'employee')).toBe(false);
      expect(isCategoryMenuVisibleForRole(control, 'admin')).toBe(true);
    });
  });
});
