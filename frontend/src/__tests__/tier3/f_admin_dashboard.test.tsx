import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetricsKpiCards } from '@/components/admin/dashboard/MetricsKpiCards';
import { RecentSettingsAuditTable } from '@/components/admin/dashboard/RecentSettingsAuditTable';
import { useAdminDashboardPresenter } from '@/hooks/presenters/useAdminDashboardPresenter';
import { apiClient } from '@/lib/api/apiClient';
import type { OverviewStats, EngagementSummary, SettingChange } from '@/hooks/presenters/useAdminDashboardPresenter';

vi.mock('@/hooks/common/use-role-guard', () => ({
  useRoleGuard: vi.fn(),
}));

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      stories: [],
      stats: { totalStories: 10, totalChapters: 20, activeStories: 5, totalViews: 100 },
      engagement: null,
      infrastructure: null,
      recentSettingsChanges: [],
    }),
  },
}));

describe('Admin Dashboard Components (Tier 3)', () => {
  const mockTranslate = (key: string, fallback?: string) => {
    const dict: Record<string, string> = {
      dash_total_stories: 'Tổng số truyện',
      dash_active_stories: 'đang phát hành',
      dash_total_chapters: 'Tổng số chương',
      dash_chapters_posted: 'Chương đã đăng',
      dash_new_users_30d: 'Độc giả mới (30 ngày)',
      dash_mau: 'MAU',
      dash_total_views: 'Tổng lượt đọc',
      dash_dau: 'DAU',
      dash_settings_log_empty: 'Chưa có nhật ký thay đổi cài đặt gần đây',
    };
    return dict[key] ?? fallback ?? key;
  };

  const mockStats: OverviewStats = {
    totalStories: 125,
    totalChapters: 3450,
    activeStories: 110,
    totalViews: 89000,
  };

  const mockEngagement: EngagementSummary = {
    dau: 1200,
    mau: 15400,
    new_signups: 450,
  };

  const mockLogs: SettingChange[] = [
    {
      id: 'log-1',
      action: 'UPDATE',
      actor_name: 'Super Admin',
      actor_email: 'admin@lightstory.com',
      metadata: { keys: ['sidebar_control', 'theme'] },
      created_at: '2026-11-10T12:00:00Z',
    },
  ];

  describe('MetricsKpiCards', () => {
    it('renders 4 KPI cards with formatted values and descriptions', () => {
      render(
        <MetricsKpiCards
          stats={mockStats}
          engagement={mockEngagement}
          t={mockTranslate}
        />
      );

      expect(screen.getByText('Tổng số truyện')).toBeInTheDocument();
      expect(screen.getByText('125')).toBeInTheDocument();
      expect(screen.getByText('110 đang phát hành')).toBeInTheDocument();

      expect(screen.getByText('Tổng số chương')).toBeInTheDocument();
      expect(screen.getByText('3.5K')).toBeInTheDocument();

      expect(screen.getByText('Độc giả mới (30 ngày)')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();

      expect(screen.getByText('Tổng lượt đọc')).toBeInTheDocument();
      expect(screen.getByText('89K')).toBeInTheDocument();
    });

    it('renders skeleton loading state when loading is true', () => {
      const { container } = render(
        <MetricsKpiCards
          stats={null}
          engagement={null}
          t={mockTranslate}
          loading={true}
        />
      );

      // Ant Design skeleton should be rendered inside loading cards
      expect(container.querySelectorAll('.ant-skeleton').length).toBe(4);
    });
  });

  describe('RecentSettingsAuditTable', () => {
    it('renders audit log entries with actor, action tag, and keys', () => {
      render(
        <RecentSettingsAuditTable
          logs={mockLogs}
          t={mockTranslate}
        />
      );

      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByText('UPDATE')).toBeInTheDocument();
      expect(screen.getByText('sidebar_control')).toBeInTheDocument();
      expect(screen.getByText('theme')).toBeInTheDocument();
    });

    it('renders empty description when logs array is empty', () => {
      render(
        <RecentSettingsAuditTable
          logs={[]}
          t={mockTranslate}
        />
      );

      expect(
        screen.getByText('Chưa có nhật ký thay đổi cài đặt gần đây')
      ).toBeInTheDocument();
    });
  });

  describe('useAdminDashboardPresenter', () => {
    it('initializes with 30d time range and allows switching timeRange', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useAdminDashboardPresenter(), { wrapper });

      expect(result.current.timeRange).toBe('30d');

      act(() => {
        result.current.setTimeRange('7d');
      });

      expect(result.current.timeRange).toBe('7d');
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('timeRange=7d'),
        expect.any(Object)
      );
    });
  });
});
