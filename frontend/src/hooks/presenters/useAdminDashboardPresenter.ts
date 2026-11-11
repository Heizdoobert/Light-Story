"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/constants/routes";
import { QUERY_KEYS, DEFAULT_CACHE_CONFIG } from "@/lib/constants/query-keys";
import { useRoleGuard } from "@/hooks/common/use-role-guard";

export type OverviewStats = {
  totalStories: number;
  totalChapters: number;
  activeStories: number;
  totalViews: number;
};

export type EngagementSummary = {
  mau?: number;
  new_signups?: number;
  dau?: number;
};

export type Story = {
  id: string;
  title: string;
  author: string;
  views: number;
  like_count: number;
  status: string;
  created_at: string;
};

export type SettingChange = {
  id: string;
  action: string;
  actor_email: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type OverviewData = {
  stats: OverviewStats | null;
  engagement: EngagementSummary | null;
  infrastructure: Record<string, unknown> | null;
  stories: Story[];
  recentSettingsChanges: SettingChange[];
};

export type DashboardTimeRange = "24h" | "7d" | "30d" | "90d";

export const initialOverviewData: OverviewData = {
  stats: null,
  engagement: null,
  infrastructure: null,
  stories: [],
  recentSettingsChanges: [],
};

export function useAdminDashboardPresenter() {
  useRoleGuard(["superadmin", "admin", "employee"], ROUTES.ADMIN.COMICS);

  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("30d");

  const query = useQuery<OverviewData>({
    queryKey: [...QUERY_KEYS.admin.dashboard, timeRange],
    queryFn: async () => {
      const url = `${ROUTES.API.ADMIN.ANALYTICS_DASHBOARD}?timeRange=${timeRange}`;
      const result = await apiClient.get<OverviewData>(
        url,
        { signal: AbortSignal.timeout(20000) }
      );
      return result ?? initialOverviewData;
    },
    staleTime: DEFAULT_CACHE_CONFIG.staleTime,
    gcTime: DEFAULT_CACHE_CONFIG.gcTime,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data ?? initialOverviewData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
    timeRange,
    setTimeRange,
  };
}
