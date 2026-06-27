"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { ValidationError } from "@/lib/errors";
import type {
  AnalyticsDashboardResponse,
  AnalyticsTimeRange,
} from "@/types/analytics";

/**
 * Phase 1 core hook: Analytics dashboard data.
 * Consolidates AnalyticsService analytics operations.
 */
export function useAnalytics() {
  const fetchDashboardMetrics = useCallback(async (timeRange: AnalyticsTimeRange = '7d') => {
    try {
      return await apiClient.get<AnalyticsDashboardResponse>(
        `/api/admin/analytics/dashboard?range=${timeRange}`
      );
    } catch (error) {
      throw new ValidationError('Failed to fetch analytics dashboard', { timeRange });
    }
  }, []);

  const recordMetric = useCallback(async (metric: {
    name: string;
    value: number;
    tags?: Record<string, string>;
  }): Promise<void> => {
    try {
      await apiClient.post('/api/analytics/metrics', metric);
    } catch (error) {
      // Non-critical; don't throw
    }
  }, []);

  const fetchTimeSeriesData = useCallback(async (metric: string, timeRange: AnalyticsTimeRange = '7d') => {
    try {
      return await apiClient.get<any[]>(
        `/api/analytics/timeseries?metric=${metric}&range=${timeRange}`
      );
    } catch (error) {
      throw new ValidationError('Failed to fetch time series data', { metric, timeRange });
    }
  }, []);

  const fetchTopPages = useCallback(async (limit = 10) => {
    try {
      return await apiClient.get<any[]>(
        `/api/analytics/top-pages?limit=${limit}`
      );
    } catch (error) {
      return [];
    }
  }, []);

  const fetchUserEngagement = useCallback(async () => {
    try {
      return await apiClient.get<any>('/api/analytics/user-engagement');
    } catch (error) {
      throw new ValidationError('Failed to fetch user engagement metrics');
    }
  }, []);

  return {
    fetchDashboardMetrics,
    recordMetric,
    fetchTimeSeriesData,
    fetchTopPages,
    fetchUserEngagement,
  };
}
