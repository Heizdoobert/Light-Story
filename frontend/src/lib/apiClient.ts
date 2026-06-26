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

import { supabase } from '@/infrastructure/supabase/client';

const IS_MOCK = process.env.NEXT_PUBLIC_API_MOCK === 'true';

const BASE_URL = IS_MOCK
  ? 'http://localhost:4010'
  : (process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787');

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
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const bodyText = await res.text();
  let body: ApiResponse<T>;
  
  try {
    body = JSON.parse(bodyText) as ApiResponse<T>;
  } catch {
    // Fallback for non-JSON responses (legacy or errors)
    throw new ApiError(
      res.status,
      'PARSE_ERROR',
      'Failed to parse API response',
    );
  }

  // Check HTTP status first
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? res.statusText,
      body?.correlationId,
    );
  }

  // Check API response status
  if (!body.success) {
    throw new ApiError(
      res.status,
      body.error?.code ?? 'API_ERROR',
      body.error?.message ?? 'API request failed',
      body.correlationId,
    );
  }

  // Unwrap and return data
  return body.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
