"use client";
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';

export function useAdminDashboardPresenter(userId: string | null, enabled = false) {
  const lastAccessLogAtRef = useRef<number>(0);

  useEffect(() => {
    if (!userId || !enabled) return;
    const now = Date.now();
    if (now - lastAccessLogAtRef.current < 60_000) return;
    lastAccessLogAtRef.current = now;
    void adminService.logDashboardAccess(userId);
  }, [userId, enabled]);

  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    enabled,
    refetchInterval: enabled ? 5000 : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      return adminService.getDashboardData();
    },
  });

  const uiSettingsQuery = useQuery({
    queryKey: ['site_settings', 'system_ui_controls'],
    enabled,
    staleTime: 60_000,
    gcTime: 300_000,
    queryFn: async () => {
      return adminService.getUiSettings();
    },
  });

  return {
    dashboardQuery,
    uiSettingsQuery,
  };
}
