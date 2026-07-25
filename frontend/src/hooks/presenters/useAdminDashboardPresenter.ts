"use client";
import { useQuery } from '@tanstack/react-query';
import * as adminService from '@/services/admin/admin.service';

export function useAdminDashboardPresenter(enabled = false) {
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    enabled,
    refetchInterval: enabled ? 5000 : false,
    refetchIntervalInBackground: false,
    queryFn: adminService.getDashboardData,
  });

  const uiSettingsQuery = useQuery({
    queryKey: ['site_settings', 'system_ui_controls'],
    enabled,
    staleTime: 60_000,
    gcTime: 300_000,
    queryFn: adminService.getUiSettings,
  });

  return {
    dashboardQuery,
    uiSettingsQuery,
  };
}
