import { HttpClient } from '../../client';
import { HealthStatus, RequestOptions } from '../../types';

export class HealthClient {
  constructor(private http: HttpClient) {}

  /**
   * Check Gateway Worker health status.
   */
  public async check(options?: RequestOptions): Promise<HealthStatus> {
    return this.http.get<HealthStatus>('/api/health', options);
  }
}
