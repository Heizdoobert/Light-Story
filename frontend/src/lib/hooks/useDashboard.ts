"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { ValidationError } from "@/lib/errors";

export type DashboardData = {
  stories?: Array<Record<string, unknown>>;
  stats?: {
    totalStories?: number;
    totalChapters?: number;
    activeStories?: number;
    totalViews?: number;
  };
};

/**
 * Phase 1 core hook: Admin dashboard data.
 * Consolidates AdminService dashboard operations.
 */
export function useDashboard() {
  const logDashboardAccess = useCallback(async (actorUserId: string): Promise<void> => {
    // Log access for audit purposes (implementation optional)
    void actorUserId;
  }, []);

  const getDashboardData = useCallback(async (): Promise<DashboardData & { syncedAt: string }> => {
    try {
      const data = await apiClient.get<DashboardData>(
        '/api/admin/analytics/dashboard?range=7d'
      );

      const stories = Array.isArray(data?.stories) ? data.stories : [];
      const totalViews = Number(data?.stats?.totalViews ?? stories.reduce((sum: number, s: any) => sum + (Number(s.views) || 0), 0));
      const activeStories = Number(data?.stats?.activeStories ?? 0);
      const totalChapters = Number(data?.stats?.totalChapters ?? 0);

      return {
        stories,
        stats: { totalViews, activeStories, totalChapters },
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useDashboard]', error);
      }
      return {
        stories: [],
        stats: { totalViews: 0, activeStories: 0, totalChapters: 0 },
        syncedAt: new Date().toISOString(),
      };
    }
  }, []);

  const getUiSettings = useCallback(async () => {
    try {
      return await apiClient.get<any>('/api/admin/site-settings');
    } catch (error) {
      throw new ValidationError('Failed to fetch UI settings');
    }
  }, []);

  const getStoriesFieldValues = useCallback(async (field: 'category' | 'author_id') => {
    try {
      return await apiClient.get<Array<Record<string, string | null>>>(
        `/api/admin/stories/field-values?field=${encodeURIComponent(field)}`
      );
    } catch (error) {
      return [];
    }
  }, []);

  const getProfileCount = useCallback(async (): Promise<number> => {
    try {
      const res = await apiClient.get<{ count?: number }>('/api/admin/site-metrics?type=profiles');
      return Number(res?.count ?? 0);
    } catch {
      return 0;
    }
  }, []);

  const getChapterCount = useCallback(async (): Promise<number> => {
    try {
      const res = await apiClient.get<{ count?: number }>('/api/admin/site-metrics?type=chapters');
      return Number(res?.count ?? 0);
    } catch {
      return 0;
    }
  }, []);

  const getAdSettingsCount = useCallback(async (): Promise<number> => {
    try {
      const res = await apiClient.get<{ count?: number }>('/api/admin/site-metrics?type=site-settings');
      return Number(res?.count ?? 0);
    } catch {
      return 0;
    }
  }, []);

  const getRoleDistribution = useCallback(async (): Promise<Array<{ role: string; total: number }>> => {
    try {
      const res = await apiClient.get<Array<{ role: string; total: number }>>('/api/admin/role-distribution');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }, []);

  return {
    logDashboardAccess,
    getDashboardData,
    getUiSettings,
    getStoriesFieldValues,
    getProfileCount,
    getChapterCount,
    getAdSettingsCount,
    getRoleDistribution,
  };
}
