/** Shared Supabase REST client utilities */

import { fetchWithHeaderTimeout } from './fetch-timeout';

/** Upper bound (time to response headers) for a Supabase REST call so a stalled upstream cannot hold the request until the platform limit. */
export const SUPABASE_TIMEOUT_MS = 15000;

export function recordAnalyticsEngineEvent(
  env: Env,
  event: {
    indexes?: string[];
    blobs?: string[];
    doubles?: number[];
  },
): void {
  try {
    if (env.ANALYTICS_DATA && typeof (env.ANALYTICS_DATA as any).writeDataPoint === 'function') {
      (env.ANALYTICS_DATA as any).writeDataPoint({
        indexes: event.indexes || [],
        blobs: event.blobs || [],
        doubles: event.doubles || [],
      });
    }
  } catch (e) {
    console.error('[AnalyticsEngine] Failed to write data point', e);
  }
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

function err(code: string, message: string, status: number): Response {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function safeUpstreamMessage(status: number, body: unknown): string {
  if (status >= 500) return 'Upstream service error';
  let parsed = body;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  const code = parsed && typeof parsed === 'object' && 'code' in parsed ? parsed.code : undefined;
  if (code === '23505') return 'Conflict: resource already exists';
  if (code === '23503') return 'Invalid reference';
  if (code === '23514' || code === '22P02') return 'Invalid input';
  if (status === 401 || status === 403) return 'Not authorized';
  if (status === 404) return 'Not found';
  return 'Request failed';
}

export function upstreamError(status: number, body: unknown): Response {
  let raw: string;
  try { raw = typeof body === 'string' ? body : JSON.stringify(body) ?? String(body); }
  catch { raw = String(body); }
  console.error('[Supabase] Upstream error:', raw.slice(0, 500));
  return err('SUPABASE_ERROR', safeUpstreamMessage(status, body), status);
}

function authToken(h: Headers): string | null {
  const a = h.get('Authorization');
  if (a?.startsWith('Bearer ')) return a.slice(7);
  return null;
}

async function sb(
  path: string,
  opts: RequestInit,
  env: Env,
  token?: string | null,
): Promise<Response> {
  const h = new Headers();
  h.set('apikey', env.SUPABASE_ANON_KEY);
  h.set('Accept', 'application/json');
  h.set(
    'Authorization',
    token
      ? `Bearer ${token}`
      : `Bearer ${env.SUPABASE_ANON_KEY}`,
  );
  if (opts.body) h.set('Content-Type', 'application/json');
  if (opts.headers) {
    const pref = (opts.headers as Record<string, string>).Prefer;
    if (pref) h.set('Prefer', pref);
  }
  const baseUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
  return fetchWithHeaderTimeout(`${baseUrl}${path}`, { ...opts, headers: h }, SUPABASE_TIMEOUT_MS);
}

async function sbGet(
  table: string,
  q: string,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sb(`/rest/v1/${table}?${q}`, { method: 'GET' }, env, token);
}

async function sbGetWithCount(
  table: string,
  q: string,
  env: Env,
  token?: string | null,
): Promise<{ res: Response; items: any[]; total: number }> {
  const res = await sb(
    `/rest/v1/${table}?${q}`,
    {
      method: 'GET',
      headers: { Prefer: 'count=exact' },
    },
    env,
    token,
  );
  if (!res.ok) {
    return { res, items: [], total: 0 };
  }
  const range = res.headers.get('content-range') || res.headers.get('Content-Range');
  let items: any[] = [];
  try {
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : [];
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = [];
  }
  let total = items.length;
  if (range) {
    const match = range.match(/\/(\d+)$/);
    if (match) total = parseInt(match[1], 10);
  }
  return { res, items, total };
}

async function sbPost(
  table: string,
  body: unknown,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sb(
    `/rest/v1/${table}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Prefer: 'return=representation' },
    },
    env,
    token,
  );
}

async function sbPatch(
  table: string,
  q: string,
  body: unknown,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sb(
    `/rest/v1/${table}?${q}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { Prefer: 'return=representation' },
    },
    env,
    token,
  );
}

async function sbDelete(
  table: string,
  q: string,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sb(
    `/rest/v1/${table}?${q}`,
    {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    },
    env,
    token,
  );
}

async function sbRpc(
  name: string,
  body: unknown,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sb(
    `/rest/v1/rpc/${name}`,
    { method: 'POST', body: JSON.stringify(body) },
    env,
    token,
  );
}

async function sbGetCount(
  q: string,
  env: Env,
  token?: string | null,
): Promise<number> {
  const h = new Headers();
  h.set('apikey', env.SUPABASE_ANON_KEY);
  h.set(
    'Authorization',
    token
      ? `Bearer ${token}`
      : `Bearer ${env.SUPABASE_ANON_KEY}`,
  );
  const baseUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
  const res = await fetchWithHeaderTimeout(`${baseUrl}/rest/v1/${q}`, {
    method: 'HEAD',
    headers: {
      ...Object.fromEntries((h as any).entries()),
      Prefer: 'count=exact',
    },
  }, SUPABASE_TIMEOUT_MS);
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  if (range) {
    const match = range.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

async function sbAdmin(
  path: string,
  opts: RequestInit,
  env: Env,
  _token?: string | null,
): Promise<Response> {
  const serviceKey = env.SUPABASE_SERVICE_KEY || (env as any).SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const h = new Headers();
  h.set('apikey', serviceKey);
  h.set('Accept', 'application/json');
  h.set('Authorization', `Bearer ${serviceKey}`);
  if (opts.body) h.set('Content-Type', 'application/json');
  if (opts.headers) {
    const pref = (opts.headers as Record<string, string>).Prefer;
    if (pref) h.set('Prefer', pref);
  }
  const baseUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
  return fetchWithHeaderTimeout(`${baseUrl}${path}`, { ...opts, headers: h }, SUPABASE_TIMEOUT_MS);
}

async function sbAdminGet(
  table: string,
  q: string,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sbAdmin(`/rest/v1/${table}?${q}`, { method: 'GET' }, env, token);
}

async function sbAdminPost(
  table: string,
  body: unknown,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sbAdmin(
    `/rest/v1/${table}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Prefer: 'return=representation' },
    },
    env,
    token,
  );
}

async function sbAdminPatch(
  table: string,
  q: string,
  body: unknown,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sbAdmin(
    `/rest/v1/${table}?${q}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { Prefer: 'return=representation' },
    },
    env,
    token,
  );
}

async function sbAdminDelete(
  table: string,
  q: string,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sbAdmin(
    `/rest/v1/${table}?${q}`,
    {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    },
    env,
    token,
  );
}

async function sbAdminGetCount(
  q: string,
  env: Env,
  token?: string | null,
): Promise<number> {
  const h = new Headers();
  h.set('apikey', env.SUPABASE_SERVICE_KEY);
  h.set('Authorization', `Bearer ${env.SUPABASE_SERVICE_KEY}`);
  const baseUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
  const res = await fetchWithHeaderTimeout(`${baseUrl}/rest/v1/${q}`, {
    method: 'HEAD',
    headers: {
      ...Object.fromEntries((h as any).entries()),
      Prefer: 'count=exact',
    },
  }, SUPABASE_TIMEOUT_MS);
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  if (range) {
    const match = range.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

async function handleRes(res: Response): Promise<Response> {
  if (!res.ok) {
    const text = await res.text();
    return upstreamError(res.status, text);
  }
  const text = await res.text();
  if (!text) return json({ success: true });
  return json(JSON.parse(text));
}

export {
  json,
  err,
  authToken,
  sb,
  sbGet,
  sbGetWithCount,
  sbPost,
  sbPatch,
  sbDelete,
  sbRpc,
  sbGetCount,
  sbAdminGet,
  sbAdminPost,
  sbAdminPatch,
  sbAdminDelete,
  sbAdminGetCount,
  handleRes,
};
