import { GatewayHttpClient } from './client';
import {
  AnalyticsOverview,
  EngagementSummary,
  InfrastructureStats,
  RequestOptions,
} from './types';

export class AnalyticsClient {
  constructor(private http: GatewayHttpClient) {}

  /**
   * Get high-level overview metrics (stories count, total views, etc.).
   */
  public async getOverview(options?: RequestOptions): Promise<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>('/api/analytics/overview', options);
  }

  /**
   * Record an analytics view event.
   */
  public async recordView(
    data: { target_id: string; type: string } | Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/api/analytics/view', data, options);
  }

  /**
   * Get user engagement and reading activity metrics.
   */
  public async getEngagement(
    days: number = 30,
    options?: RequestOptions,
  ): Promise<EngagementSummary> {
    return this.http.get<EngagementSummary>('/api/analytics/engagement', {
      ...options,
      params: {
        days,
        ...(options?.params || {}),
      },
    });
  }

  /**
   * Get Cloudflare infrastructure and delivery telemetry (R2, requests, device breakdown).
   */
  public async getInfrastructure(options?: RequestOptions): Promise<InfrastructureStats> {
    return this.http.get<InfrastructureStats>('/api/analytics/infrastructure', options);
  }
}
