"use client";

import { useState } from 'react';
import { useAnalyticsDashboard } from './useAnalyticsDashboard';
import type { AnalyticsRole, AnalyticsTimeRange } from '@/types/analytics';

export function useAnalyticsDashboardTabPresenter(role: AnalyticsRole | null) {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('7d');
  const dashboardQuery = useAnalyticsDashboard(timeRange, role);

  const isAdmin = role === 'superadmin' || role === 'admin';
  const limitedView = role === 'employee';

  return {
    timeRange,
    setTimeRange,
    dashboardQuery,
    isAdmin,
    limitedView,
  };
}
