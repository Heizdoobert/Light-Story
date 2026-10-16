import { GatewayHttpClient } from './client';
import { RequestOptions } from './types';

export class AdminClient {
  constructor(private http: GatewayHttpClient) {}

  /**
   * Get site settings from Gateway/Supabase.
   */
  public async getSiteSettings(
    scope?: 'public' | 'all',
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/admin/site-settings', {
      ...options,
      params: {
        ...(scope ? { scope } : {}),
        ...(options?.params || {}),
      },
    });
  }

  /**
   * Update site settings (Admin / Superadmin only).
   */
  public async updateSiteSettings(
    settings: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/api/admin/site-settings', settings, options);
  }

  /**
   * Get operational metrics and worker bindings status.
   */
  public async getMetrics(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/admin/metrics', options);
  }

  /**
   * Get admin audit / access logs.
   */
  public async getLogs(
    params?: { limit?: number; offset?: number; type?: string },
    options?: RequestOptions,
  ): Promise<{ logs: unknown[]; total?: number }> {
    return this.http.get('/api/admin/logs', {
      ...options,
      params: {
        ...(params as Record<string, string | number | undefined>),
        ...(options?.params || {}),
      },
    });
  }

  /**
   * Create a system backup snapshot.
   */
  public async createBackup(options?: RequestOptions): Promise<{ snapshotId: string; data: unknown }> {
    return this.http.post('/api/admin/backup', {}, options);
  }

  /**
   * Restore system settings from a JSON snapshot.
   */
  public async restoreBackup(
    snapshot: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.post('/api/admin/restore', { snapshot }, options);
  }
}
