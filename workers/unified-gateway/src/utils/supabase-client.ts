/** Shared Supabase REST client utilities */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY?: string;
  SUPABASE_JWKS_URL?: string;
  R2_BUCKET?: R2Bucket;
  USE_NEW_UNIFIED_GATEWAY?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function err(code: string, message: string, status: number): Response {
  return json({ status: 'error', error: { code, message } }, status);
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
  return fetch(`${env.SUPABASE_URL}${path}`, { ...opts, headers: h });
}

async function sbGet(
  table: string,
  q: string,
  env: Env,
  token?: string | null,
): Promise<Response> {
  return sb(`/rest/v1/${table}?${q}`, { method: 'GET' }, env, token);
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
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, {
    method: 'HEAD',
    headers: {
      ...Object.fromEntries(h.entries()),
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  if (range) {
    const match = range.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

const SENSITIVE_PATTERNS = [
  /\b(?:password|secret|token|key)\s*[:=]\s*\S+/gi,
];

function sanitizeMessage(msg: string): string {
  let clean = msg;
  for (const p of SENSITIVE_PATTERNS) {
    clean = clean.replace(p, '$1: [REDACTED]');
  }
  if (clean.length > 500) clean = clean.slice(0, 500) + '...';
  return clean;
}

async function handleRes(res: Response): Promise<Response> {
  if (!res.ok) {
    const text = await res.text();
    return err('SUPABASE_ERROR', sanitizeMessage(text), res.status);
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
  sbPost,
  sbPatch,
  sbDelete,
  sbRpc,
  sbGetCount,
  handleRes,
};
