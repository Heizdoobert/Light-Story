import { GatewayConfig, RequestOptions } from './types';
import { GatewayHttpClient } from './client';
import { HealthClient } from './health';
import { R2Client } from './r2';
import { ComicsClient } from './comics';
import { StoriesClient } from './stories';
import { AdminClient } from './admin';
import { AnalyticsClient } from './analytics';
import { UserClient } from './user';

export * from './types';
export * from './errors';
export * from './client';
export * from './health';
export * from './r2';
export * from './comics';
export * from './stories';
export * from './admin';
export * from './analytics';
export * from './user';

/**
 * Unified Gateway Client for Cloudflare Worker Gateway.
 */
export class GatewayClient {
  public readonly http: GatewayHttpClient;
  public readonly health: HealthClient;
  public readonly r2: R2Client;
  public readonly comics: ComicsClient;
  public readonly stories: StoriesClient;
  public readonly admin: AdminClient;
  public readonly analytics: AnalyticsClient;
  public readonly user: UserClient;

  constructor(config: GatewayConfig = {}) {
    this.http = new GatewayHttpClient(config);
    this.health = new HealthClient(this.http);
    this.r2 = new R2Client(this.http);
    this.comics = new ComicsClient(this.http);
    this.stories = new StoriesClient(this.http);
    this.admin = new AdminClient(this.http);
    this.analytics = new AnalyticsClient(this.http);
    this.user = new UserClient(this.http);
  }

  public getBaseUrl(): string {
    return this.http.getBaseUrl();
  }

  public request<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.http.request<T>(path, options);
  }

  public get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.http.get<T>(path, options);
  }

  public post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.http.post<T>(path, body, options);
  }

  public put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.http.put<T>(path, body, options);
  }

  public patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.http.patch<T>(path, body, options);
  }

  public delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.http.delete<T>(path, options);
  }
}

/**
 * Factory function to create a new GatewayClient instance.
 */
export function createGatewayClient(config?: GatewayConfig): GatewayClient {
  return new GatewayClient(config);
}

/**
 * Default singleton instance of GatewayClient for application-wide use.
 */
export const gatewayClient = new GatewayClient();

/**
 * Alias singleton instance matching gatewaySdk convention.
 */
export const gatewaySdk = gatewayClient;
