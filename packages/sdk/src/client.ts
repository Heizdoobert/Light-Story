import {
  ClientConfig,
  RequestOptions,
  GatewayApiResponse,
  SdkLogger,
} from './types';
import { GatewayError, SdkTimeoutError, SdkNetworkError } from './errors';
import {
  resolveRetryConfig,
  shouldRetryRequest,
  calculateRetryDelay,
  sleepWithSignal,
  ResolvedRetryConfig,
} from './retry';
import {
  Interceptors,
  createInterceptors,
  RequestContext,
} from './interceptors';

export class HttpClient {
  protected config: ClientConfig;
  protected defaultRetry: ResolvedRetryConfig;
  protected logger?: SdkLogger;
  public readonly interceptors: Interceptors;

  constructor(config: ClientConfig = {}) {
    this.config = config;
    this.defaultRetry = resolveRetryConfig(config.retry);
    this.logger = config.logger;
    this.interceptors = createInterceptors();
  }

  public getBaseUrl(): string {
    return (this.config.baseUrl || '').replace(/\/+$/, '');
  }

  protected async resolveToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken !== undefined) {
      return explicitToken;
    }
    const tokenGetter = this.config.getAuthToken || this.config.getAccessToken;
    if (tokenGetter) {
      return await tokenGetter();
    }
    return null;
  }

  public buildUrl(path: string, params?: RequestOptions['params']): string {
    // If path is already an absolute URL, do not prepend baseUrl
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        });
      }
      return url.toString();
    }

    const baseUrl = this.getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;

    // Relative path or absolute URL support
    let url: URL;
    try {
      url = new URL(fullUrl);
    } catch {
      url = new URL(fullUrl, 'http://localhost');
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    if (!baseUrl) {
      return url.pathname + url.search;
    }

    return url.toString();
  }

  private serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
    if (body === undefined || body === null) return undefined;

    // Standard string
    if (typeof body === 'string') return body;

    // FormData
    if (typeof FormData !== 'undefined' && body instanceof FormData) return body;

    // Blob
    if (typeof Blob !== 'undefined' && body instanceof Blob) return body;

    // ArrayBuffer / ArrayBufferView
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return body as BodyInit;

    // URLSearchParams
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return body;

    // Plain JS object / array -> auto-serialize to JSON
    if (typeof body === 'object') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return JSON.stringify(body);
    }

    return String(body);
  }

  public async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    let reqContext: RequestContext = {
      ...options,
      url: this.buildUrl(path, options.params),
      method: (options.method || 'GET').toUpperCase(),
    };

    reqContext = await this.interceptors.request.runPipeline(reqContext, async (curr, handler) => {
      const res = await handler(curr);
      return res ? { ...curr, ...res } : curr;
    });

    const {
      params,
      token: explicitToken,
      headers: customHeaders,
      body: rawBody,
      timeoutMs: explicitTimeout,
      retry: explicitRetry,
      signal: callerSignal,
      url,
      method,
      ...restOptions
    } = reqContext;

    // Fast-fail if caller signal is already aborted
    if (callerSignal?.aborted) {
      throw callerSignal.reason ?? new Error('Request aborted by caller');
    }

    const fetchFn = this.config.fetch || globalThis.fetch;
    const timeoutMs = explicitTimeout ?? this.config.timeoutMs ?? 15000;

    // Resolve per-request retry configuration
    let retryConfig: ResolvedRetryConfig;
    let optIn: boolean | undefined;

    if (typeof explicitRetry === 'boolean') {
      optIn = explicitRetry;
      retryConfig = this.defaultRetry;
    } else if (typeof explicitRetry === 'object' && explicitRetry !== null) {
      retryConfig = resolveRetryConfig({ ...this.defaultRetry, ...explicitRetry });
      optIn = (explicitRetry as { retry?: boolean }).retry === true;
    } else {
      retryConfig = this.defaultRetry;
    }

    // Prepare headers
    const headers = new Headers(this.config.defaultHeaders);
    if (customHeaders) {
      new Headers(customHeaders).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // Inject token if Authorization is not already set
    if (!headers.has('Authorization')) {
      const token = await this.resolveToken(explicitToken);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Serialize body and set content-type if appropriate
    const body = this.serializeBody(rawBody, headers);

    let attempt = 0;

    while (true) {
      // Setup timeout controller & combine with caller signal
      const timeoutController = new AbortController();
      let isTimeout = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          isTimeout = true;
          timeoutController.abort(new SdkTimeoutError(timeoutMs, url));
        }, timeoutMs);
      }

      const onCallerAbort = () => {
        timeoutController.abort(callerSignal?.reason);
      };

      if (callerSignal) {
        if (callerSignal.aborted) {
          if (timer) clearTimeout(timer);
          throw callerSignal.reason ?? new Error('Request aborted by caller');
        }
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }

      let response: Response;
      this.logger?.debug?.(`[SDK] ${method} ${url} (attempt ${attempt + 1})`);

      let responseData: unknown;

      try {
        response = await fetchFn(url, {
          ...restOptions,
          method,
          headers,
          body,
          signal: timeoutController.signal,
        });

        // Parse response body while timeout timer is still active
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (isJson) {
          try {
            responseData = await response.json();
          } catch {
            responseData = null;
          }
        } else {
          try {
            responseData = await response.text();
          } catch {
            responseData = null;
          }
        }
      } catch (err) {
        if (timer) clearTimeout(timer);
        if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);

        // Immediate check: did caller signal abort?
        if (callerSignal?.aborted) {
          throw callerSignal.reason ?? err;
        }

        if (isTimeout) {
          this.logger?.error?.(`[SDK] Timeout after ${timeoutMs}ms on ${method} ${url}`);
          throw new SdkTimeoutError(timeoutMs, url);
        }

        const isAbort = err instanceof Error && err.name === 'AbortError' && !isTimeout;
        if (isAbort) {
          throw err;
        }

        const networkErr = err instanceof Error ? err : new Error(String(err));
        if (shouldRetryRequest(method, attempt, networkErr, retryConfig, optIn)) {
          const delay = calculateRetryDelay(attempt, retryConfig);
          this.logger?.warn?.(
            `[SDK] Network error on ${method} ${url}: ${networkErr.message}. Retrying in ${delay}ms (${attempt + 1}/${retryConfig.maxRetries})`,
          );
          await sleepWithSignal(delay, callerSignal || undefined);
          attempt++;
          continue;
        }

        throw new SdkNetworkError(networkErr.message, networkErr);
      } finally {
        if (timer) clearTimeout(timer);
        if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
      }

      // If status indicates retryable server error
      if (!response.ok && shouldRetryRequest(method, attempt, response.status, retryConfig, optIn)) {
        const delay = calculateRetryDelay(attempt, retryConfig, response.headers);
        if (delay >= 0) {
          this.logger?.warn?.(
            `[SDK] HTTP ${response.status} on ${method} ${url}. Retrying in ${delay}ms (${attempt + 1}/${retryConfig.maxRetries})`,
          );
          await sleepWithSignal(delay, callerSignal || undefined);
          attempt++;
          continue;
        }
      }

      if (!response.ok) {
        this.logger?.error?.(`[SDK] HTTP ${response.status} ${response.statusText} on ${method} ${url}`);
        throw GatewayError.fromResponse(response.status, responseData, response.statusText);
      }

      // Unwrap API envelope if format is { success: true, data: T }
      let finalData: unknown = responseData;
      if (finalData && typeof finalData === 'object') {
        const apiRes = finalData as GatewayApiResponse<T>;
        if (apiRes.success === false) {
          const errMsg = apiRes.error?.message || 'Gateway operation returned success: false';
          throw new GatewayError(response.status, errMsg, apiRes.error?.code || 'GATEWAY_ERROR', apiRes);
        }
        if (apiRes.success === true && 'data' in apiRes) {
          finalData = apiRes.data;
        }
      }

      finalData = await this.interceptors.response.runPipeline(finalData, async (curr, handler) => {
        const res = await handler(response, curr);
        return res !== undefined ? res : curr;
      });

      return finalData as T;
    }
  }

  public get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  public put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  public patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  public delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
