import { getGatewayUrl } from '@/lib/utils/gateway-url';
import { GatewayConfig, RequestOptions, GatewayApiResponse } from './types';
import { GatewayError } from './errors';

export class GatewayHttpClient {
  private config: GatewayConfig;

  constructor(config: GatewayConfig = {}) {
    this.config = config;
  }

  public getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl.replace(/\/+$/, '');
    }
    return getGatewayUrl().replace(/\/+$/, '');
  }

  private async resolveToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken !== undefined) {
      return explicitToken;
    }
    const tokenGetter = this.config.getAuthToken || this.config.getAccessToken;
    if (tokenGetter) {
      return await tokenGetter();
    }
    // Attempt browser-side Supabase session lookup if in client environment
    if (typeof window !== 'undefined') {
      try {
        const { supabase } = await import('../supabaseClient');
        const { data } = await supabase.auth.getSession();
        return data?.session?.access_token ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }

  public buildUrl(path: string, params?: RequestOptions['params']): string {
    const baseUrl = this.getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  public async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, token: explicitToken, headers: customHeaders, body, ...restOptions } = options;
    const url = this.buildUrl(path, params);
    const fetchFn = this.config.fetch || fetch;

    const headers = new Headers(this.config.defaultHeaders);
    if (customHeaders) {
      new Headers(customHeaders).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // Only inject token if Authorization header is not already explicitly set
    if (!headers.has('Authorization')) {
      const token = await this.resolveToken(explicitToken);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (!(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
      response = await fetchFn(url, {
        ...restOptions,
        headers,
        body,
      });
    } catch (err) {
      throw new GatewayError(
        0,
        err instanceof Error ? err.message : 'Network request failed',
        'NETWORK_ERROR',
        err,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const resWithCache = response as unknown as { __parsedBody?: unknown };
    let responseData: unknown = resWithCache.__parsedBody;
    if (responseData === undefined) {
      if (isJson) {
        try {
          responseData = await response.json();
          resWithCache.__parsedBody = responseData;
        } catch {
          responseData = null;
        }
      } else {
        try {
          responseData = await response.text();
          resWithCache.__parsedBody = responseData;
        } catch {
          responseData = null;
        }
      }
    }

    if (!response.ok) {
      throw GatewayError.fromResponse(response.status, responseData, response.statusText);
    }

    // Unwrap gateway wrapper if standard format { success: true, data: T }
    if (responseData && typeof responseData === 'object') {
      const apiRes = responseData as GatewayApiResponse<T>;
      if (apiRes.success !== undefined && 'data' in apiRes) {
        return apiRes.data as T;
      }
    }

    return responseData as T;
  }

  public get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = body instanceof FormData;
    const serializedBody = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'POST', body: serializedBody });
  }

  public put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = body instanceof FormData;
    const serializedBody = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'PUT', body: serializedBody });
  }

  public patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const isFormData = body instanceof FormData;
    const serializedBody = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(path, { ...options, method: 'PATCH', body: serializedBody });
  }

  public delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
