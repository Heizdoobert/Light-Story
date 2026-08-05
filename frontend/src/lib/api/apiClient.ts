import type { ApiResponse } from '@light-story/api-types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

import { supabase } from '@/lib/supabase/client';

const IS_MOCK = process.env.NEXT_PUBLIC_API_MOCK === 'true';

const getBaseUrl = (): string => {
  if (IS_MOCK) return 'http://localhost:4010';
  let rawUrl = '';
  if (process.env.NODE_ENV === 'production') {
    rawUrl =
      process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION ||
      process.env.NEXT_PUBLIC_GATEWAY_URL ||
      'https://kv-worker.hhhuygiau.workers.dev';
  } else {
    rawUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
  }
  return rawUrl.replace(/\/+$/, '');
};

const BASE_URL = getBaseUrl();

// Tolerated error-envelope shapes across gateway/workers (superset of ApiResponse:
// some workers return plain {message} or {error_description} instead of the envelope).
type ErrorBody = {
  success?: boolean;
  error?:
    | string
    | { code?: string; message?: string; details?: Record<string, unknown> };
  message?: string;
  error_description?: string;
  code?: string;
  correlationId?: string;
};

function parseErrorMessage(body: ErrorBody, fallback: string): string {
  if (typeof body.error === 'string') return body.error;
  return body.error?.message ?? body.message ?? body.error_description ?? fallback;
}

function parseErrorCode(body: ErrorBody): string | undefined {
  return typeof body.error === 'object' && body.error ? body.error.code : body.code;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body == null) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp ? now >= payload.exp - 10 : true;
  } catch {
    return true;
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const sbKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (sbKeys.length > 0) {
      const raw = localStorage.getItem(sbKeys[0]);
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.access_token && !isTokenExpired(session.access_token)) {
          return session.access_token;
        }
      }
    }
  } catch {
  }
  return null;
}

let _pendingToken: Promise<string | null> | null = null;
async function getAccessTokenAsync(): Promise<string | null> {
  if (_pendingToken) return _pendingToken;
  _pendingToken = (async () => {
    const sync = getAccessToken();
    if (sync) return sync;
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  })();
  try {
    return await _pendingToken;
  } finally {
    _pendingToken = null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessTokenAsync();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  const signal = options.signal || controller.signal;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      cache: 'no-store',
      ...options,
      headers,
      signal,
    });
  } catch (err) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      err instanceof TypeError && err.message === 'Failed to fetch'
        ? 'Unable to connect to server. Please check your internet connection and try again.'
        : (err as Error)?.name === 'AbortError'
        ? 'Request timed out'
        : (err as Error)?.message || 'Network request failed',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const bodyText = await res.text();

  // Check HTTP status first (before JSON parsing so empty error bodies
  // and non-JSON responses are reported as their actual status, not PARSE_ERROR)
  if (!res.ok) {
    let parsed: ErrorBody = {};
    try {
      parsed = bodyText ? (JSON.parse(bodyText) as ErrorBody) : {};
    } catch {
      parsed = {};
    }
    throw new ApiError(
      res.status,
      parseErrorCode(parsed) ?? 'HTTP_ERROR',
      parseErrorMessage(parsed, res.statusText || `HTTP Error ${res.status}`),
      parsed.correlationId,
    );
  }

  // Empty successful body (e.g. 204 No Content or 200 with no payload) → return void
  if (!bodyText) {
    return undefined as T;
  }

  let body: ApiResponse<T>;
  try {
    body = JSON.parse(bodyText) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      res.status,
      'PARSE_ERROR',
      'Failed to parse API response',
    );
  }

  // Check API response status
  if (body && (body as ErrorBody).success === false) {
    throw new ApiError(
      res.status,
      body.error?.code ?? 'API_ERROR',
      parseErrorMessage(body as ErrorBody, 'API request failed'),
      body.correlationId,
    );
  }

  // Unwrap and return data
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }

  return body as unknown as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'POST',
      body: serializeBody(body),
      ...options,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PUT',
      body: serializeBody(body),
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PATCH',
      body: serializeBody(body),
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { method: 'DELETE', ...options }),
};
