import type { DashboardDataDTO, OverviewMetricsDTO } from '@/application/dtos/dashboard';

function emptyDashboardData(): DashboardDataDTO {
  return {
    stories: [],
    stats: { totalViews: 0, activeStories: 0, totalChapters: 0 },
    syncedAt: new Date().toISOString(),
  };
}

export class AdminDashboardQueryGateway {
  async loadDashboardData(): Promise<DashboardDataDTO> {
    return emptyDashboardData();
  }

  async loadOverviewMetrics(): Promise<OverviewMetricsDTO> {
    // Note: This is currently a client-side gateway, so it cannot use server-side Supabase.
    // To fetch real metrics, use API endpoints instead (e.g., /api/internal/admin/profiles)
    return {
      profileCount: 0,
      chapterCount: 0,
      adSettingsCount: 0,
      roleDistribution: [],
    };
  }
}