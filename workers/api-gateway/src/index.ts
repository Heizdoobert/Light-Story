import { validateJWT, UnauthorizedError } from './auth';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://lightstory.app',
  'https://staging.lightstory.app',
];

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Expose-Headers': 'x-request-id, x-begin-timestamp',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function stripApiPrefix(pathname: string) {
  return pathname.replace(/^\/api\/?v?\d*\/?/i, '/');
}

function supabaseProxyPath(pathname: string): string | null {
  // /api/supabase/rest/v1/* -> /rest/v1/*
  // /api/supabase/auth/v1/* -> /auth/v1/*
  // /api/supabase/storage/v1/* -> /storage/v1/*
  const match = pathname.match(/^\/api\/supabase\/(rest|auth|storage)(\/v\d+\/.*)$/i);
  if (match) return `/${match[1]}${match[2]}`;

  // /api/rpc/<rpc_name> -> /rest/v1/rpc/<rpc_name>
  const rpcMatch = pathname.match(/^\/api\/rpc\/(.+)$/i);
  if (rpcMatch) return `/rest/v1/rpc/${rpcMatch[1]}`;

  return null;
}

async function handleSupabaseProxy(pathname: string, request: Request, origin: string | null): Promise<Response> {
  const supabaseUrl = (globalThis as any).SUPABASE_URL as string;
  const anonKey = (globalThis as any).SUPABASE_ANON_KEY as string;

  if (!supabaseUrl || !anonKey) {
    return new Response(
      JSON.stringify({ status: 'error', error: { code: 'SUPABASE_NOT_CONFIGURED' } }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...(origin ? corsHeaders(origin) : {}) } },
    );
  }

  const sbPath = supabaseProxyPath(pathname);
  if (!sbPath) {
    return new Response(
      JSON.stringify({ status: 'error', error: { code: 'INVALID_SUPABASE_PATH' } }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...(origin ? corsHeaders(origin) : {}) } },
    );
  }

  const targetUrl = `${supabaseUrl}${sbPath}`;
  const headers = new Headers(request.headers);

  // Ensure proper Supabase headers
  headers.set('apikey', anonKey);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${anonKey}`);
  }

  // Remove hop-by-hop and gateway-internal headers
  headers.delete('x-forwarded-by');
  headers.delete('x-begin-timestamp');
  headers.delete('x-request-id');

  const upstreamReq = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.body ?? undefined,
    redirect: 'manual',
  });

  const res = await fetch(upstreamReq);
  const responseHeaders = new Headers(res.headers);
  if (origin) {
    const c = corsHeaders(origin);
    for (const [k, v] of Object.entries(c)) responseHeaders.set(k, v as string);
  }

  return new Response(res.body, { status: res.status, headers: responseHeaders });
}

export async function onRequest(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Supabase proxy routes — no JWT required (auth handled by Supabase RLS)
  const pathname = url.pathname;
  if (pathname.startsWith('/api/supabase/') || pathname.startsWith('/api/rpc/')) {
    return handleSupabaseProxy(pathname, request, origin);
  }

  // Authenticate (best-effort). If missing/invalid -> 401.
  const authHeader = request.headers.get('Authorization') ?? '';
  let authCtx = null;
  try {
    if (authHeader) authCtx = await validateJWT(authHeader);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ status: 'error', error: { code: 'UNAUTHORIZED', message: e.message } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...(origin ? corsHeaders(origin) : {}) },
      });
    }
    return new Response(JSON.stringify({ status: 'error', error: { code: 'INTERNAL_ERROR' } }), { status: 500 });
  }

  // Determine target binding based on path
  let targetBinding: any = null;
  if (pathname.startsWith('/api/v1/comics') || pathname.startsWith('/api/comics')) {
    targetBinding = (globalThis as any).COMICS_WORKER;
  } else if (pathname.startsWith('/api/v1/stories') || pathname.startsWith('/api/stories')) {
    targetBinding = (globalThis as any).STORIES_WORKER;
  } else if (pathname.startsWith('/api/v1/admin') || pathname.startsWith('/api/admin')) {
    targetBinding = (globalThis as any).ADMIN_WORKER;
  } else if (pathname.startsWith('/api/v1/analytics') || pathname.startsWith('/api/analytics')) {
    targetBinding = (globalThis as any).ANALYTICS_WORKER;
  } else {
    // Unknown path — simple 404
    return new Response(JSON.stringify({ status: 'error', error: { code: 'NOT_FOUND' } }), { status: 404 });
  }

  if (!targetBinding || typeof targetBinding.fetch !== 'function') {
    return new Response(JSON.stringify({ status: 'error', error: { code: 'SERVICE_UNAVAILABLE' } }), { status: 502 });
  }

  // Build downstream request
  const downstreamUrl = new URL(request.url);
  downstreamUrl.pathname = stripApiPrefix(downstreamUrl.pathname);

  const headers = new Headers(request.headers);
  headers.set('x-request-id', crypto.randomUUID());
  headers.set('x-begin-timestamp', String(Date.now()));
  if (authCtx) {
    headers.set('x-user-id', authCtx.userId);
    headers.set('x-user-role', authCtx.role);
    if (authCtx.email) headers.set('x-user-email', authCtx.email);
  }
  // Mark forwarded-by for preview local protection
  headers.set('x-forwarded-by', 'api-gateway');

  const downstreamReq = new Request(downstreamUrl.toString(), {
    method: request.method,
    headers,
    body: request.body ?? undefined,
    redirect: 'manual',
  });

  const res = await targetBinding.fetch(downstreamReq);

  // Propagate CORS headers when origin is present
  const responseHeaders = new Headers(res.headers);
  if (origin) {
    const c = corsHeaders(origin);
    for (const [k, v] of Object.entries(c)) responseHeaders.set(k, v as string);
  }

  return new Response(res.body, { status: res.status, headers: responseHeaders });
}
