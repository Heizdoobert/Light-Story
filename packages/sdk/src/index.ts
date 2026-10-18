import { ClientConfig, GatewayConfig, RequestOptions } from './types';
import { HttpClient } from './client';
import { HealthClient } from './gateway/health';
import { R2Client } from './gateway/r2';
import { ComicsClient } from './gateway/comics';
import { StoriesClient } from './gateway/stories';
import { AdminClient } from './gateway/admin';
import { AnalyticsClient } from './gateway/analytics';
import { UserClient } from './gateway/user';

export * from './types';
export * from './errors';
export * from './retry';
export * from './interceptors';
export * from './client';
export * from './gateway';

/**
 * Unified Gateway Client for Light-Story.
 */
export class GatewayClient {
  public readonly http: HttpClient;
  public readonly health: HealthClient;
  public readonly r2: R2Client;
  public readonly comics: ComicsClient;
  public readonly stories: StoriesClient;
  public readonly admin: AdminClient;
  public readonly analytics: AnalyticsClient;
  public readonly user: UserClient;

  constructor(config: GatewayConfig = {}) {
    this.http = new HttpClient(config);
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

/** Modern naming alias */
export const LightStoryClient = GatewayClient;

/**
 * Factory function to create a new GatewayClient / LightStoryClient instance.
 */
export function createGatewayClient(config?: GatewayConfig): GatewayClient {
  return new GatewayClient(config);
}

export function createLightStoryClient(config?: ClientConfig): GatewayClient {
  return new GatewayClient(config);
}
