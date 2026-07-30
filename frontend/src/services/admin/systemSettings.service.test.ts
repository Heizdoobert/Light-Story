import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: mockApiClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchSystemSettingsSnapshot', () => {
  it('returns parsed settings from API', async () => {
    mockApiClient.get.mockResolvedValue([
      { key: 'ui_compact_mode', value: true },
      { key: 'ui_show_sync_badge', value: false },
      { key: 'dashboard_tab_visibility', value: { admin: ['dashboard', 'stories'], superadmin: ['dashboard'], employee: ['dashboard'], user: [] } },
      { key: 'sidebar_menu_visibility', value: { admin: ['dashboard', 'stories'], superadmin: ['dashboard'], employee: ['dashboard'], user: [] } },
    ]);

    const { fetchSystemSettingsSnapshot } = await import('./systemSettings.service');
    const result = await fetchSystemSettingsSnapshot();

    expect(result.compactMode).toBe(true);
    expect(result.showSyncBadge).toBe(false);
    expect(result.dashboardTabVisibility.admin).toContain('dashboard');
    expect(result.dashboardTabVisibility.admin).toContain('stories');
    expect(result.sidebarMenuVisibility.admin).toContain('dashboard');
  });

  it('returns defaults on API error', async () => {
    mockApiClient.get.mockRejectedValue(new Error('API down'));

    const { fetchSystemSettingsSnapshot } = await import('./systemSettings.service');
    const result = await fetchSystemSettingsSnapshot();

    expect(result.compactMode).toBe(false);
    expect(result.showSyncBadge).toBe(true);
    expect(result.dashboardTabVisibility.superadmin).toBeDefined();
    expect(result.dashboardTabVisibility.admin.length).toBeGreaterThan(0);
    expect(result.sidebarMenuVisibility.superadmin).toBeDefined();
    expect(result.sidebarMenuVisibility.admin.length).toBeGreaterThan(0);
  });

  it('handles empty API response', async () => {
    mockApiClient.get.mockResolvedValue([]);

    const { fetchSystemSettingsSnapshot } = await import('./systemSettings.service');
    const result = await fetchSystemSettingsSnapshot();

    expect(result.compactMode).toBe(false);
    expect(result.showSyncBadge).toBe(true);
  });

  it('filters out rows without key', async () => {
    mockApiClient.get.mockResolvedValue([
      { value: true },
      { key: '', value: 'x' },
    ]);

    const { fetchSystemSettingsSnapshot } = await import('./systemSettings.service');
    const result = await fetchSystemSettingsSnapshot();

    expect(result.compactMode).toBe(false);
  });
});

describe('saveSystemSettingsSnapshot', () => {
  it('POSTs all settings as payload array', async () => {
    mockApiClient.post.mockResolvedValue({});

    const { saveSystemSettingsSnapshot } = await import('./systemSettings.service');
    await saveSystemSettingsSnapshot({
      compactMode: true,
      showSyncBadge: false,
      dashboardTabVisibility: { admin: ['dashboard'], superadmin: ['dashboard'], employee: ['dashboard'], user: [] },
      sidebarMenuVisibility: { admin: ['dashboard'], superadmin: ['dashboard'], employee: ['dashboard'], user: [] },
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/site-settings', {
      payload: [
        { key: 'ui_compact_mode', value: true },
        { key: 'ui_show_sync_badge', value: false },
        { key: 'dashboard_tab_visibility', value: { admin: ['dashboard'], superadmin: ['dashboard'], employee: ['dashboard'], user: [] } },
        { key: 'sidebar_menu_visibility', value: { admin: ['dashboard'], superadmin: ['dashboard'], employee: ['dashboard'], user: [] } },
      ],
    });
  });
});