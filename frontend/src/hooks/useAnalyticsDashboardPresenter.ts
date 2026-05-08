"use client";
import { useQuery } from '@tanstack/react-query';
import type { AnalyticsDashboardResponse, AnalyticsTimeRange } from '@/types/analytics';

/**
 * Hook: Fetch analytics dashboard data with React Query
 * Handles authentication, error boundaries, and caching
 */
export function useAnalyticsDashboardPresenter(
  timeRange: AnalyticsTimeRange = '7d',
  enabled: boolean = false,
  pollInterval: number = 0,
) {
  const dashboardQuery = useQuery({
    queryKey: ['analytics-dashboard', timeRange],
    enabled,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval: pollInterval > 0 ? pollInterval : false,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<AnalyticsDashboardResponse> => {
      const url = new URL('/api/internal/admin/analytics/dashboard', window.location.origin);
      url.searchParams.set('range', timeRange);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = new Error(`Analytics fetch failed: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = (await response.json()) as AnalyticsDashboardResponse;
      return data;
    },
  });

  return {
    dashboardQuery,
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  };
}
