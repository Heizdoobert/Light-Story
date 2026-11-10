/** Unified Gateway - Main entry point */

import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import {
  err,
  json,
  authToken,
  recordAnalyticsEngineEvent,
} from './utils/supabase-client';
import {
  corsHeaders,
  isOriginAllowed,
  handleCorsPreflightRequest,
  stripApiPrefix,
  supabaseProxyPath,
} from './middleware/cors';
import {
  validateJWT,
  UnauthorizedError,
} from './middleware/auth';
import { handleStoriesRequest } from './routes/stories';
import { incrementStoryView } from './counters';
import { handleComicsRequest } from './routes/comics';
import { handleAdminRequest } from './routes/admin';
import { handleAnalyticsRequest } from './routes/analytics';
import { handleUserRequest } from './routes/user';
import { handleHyperdriveRequest } from './routes/hyperdrive';
import { checkRateLimit } from './middleware/rateLimitKV';
import { applySecurityHeaders } from './middleware/securityHeaders';
import { classifyR2Get, conditionalGetOptions } from './utils/r2-conditional';
import { handleTieringFallback } from './utils/tiering-fallback';
import { checkIdempotency, saveIdempotency } from './middleware/idempotency';
import { getAuthRole, requireActionRole } from './utils/validation';

function detectDevice(ua: string): string {
  if (/bot|crawler|spider|curl|wget|python|headless/i.test(ua)) return 'bot';
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|BlackBerry|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

async function handleSupabaseProxy(
  pathname: string,
  request: Request,
  origin: string | null,
  env: Env,
  requestId: string,
): Promise<Response> {
  const respond = (body: unknown, init: { status: number; headers?: HeadersInit }) => {
    const headers = new Headers(init.headers);
    headers.set('X-Request-Id', requestId);
    applySecurityHeaders(headers);
    return new Response(
      typeof body === 'string' ? body : JSON.stringify(body),
      { ...init, headers },
    );
  };

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return respond(
      { success: false, error: { code: 'SUPABASE_NOT_CONFIGURED', requestId } },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      },
    );
  }

  const sbPath = supabaseProxyPath(pathname);
  if (!sbPath) {
    return respond(
      { success: false, error: { code: 'INVALID_SUPABASE_PATH', requestId } },
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      },
    );
  }

  const sbUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
  const targetUrl = `${sbUrl}${sbPath}`;
  const headers = new Headers(request.headers);
  headers.delete('x-user-role');
  headers.delete('x-user-id');
  headers.delete('x-user-email');
  headers.set('apikey', env.SUPABASE_ANON_KEY);
  const authHeader =
    request.headers.get('Authorization') ??
    request.headers.get('authorization');
  if (authHeader) {
    headers.set('Authorization', authHeader);
  } else {
    headers.set('Authorization', `Bearer ${env.SUPABASE_ANON_KEY}`);
  }
  headers.delete('x-forwarded-by');
  headers.delete('x-begin-timestamp');
  headers.set('x-request-id', requestId);
  headers.delete('content-length');

  const reqText = request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : null;

  const upstreamReq = new Request(targetUrl, {
    method: request.method,
    headers,
    body: reqText ? reqText : undefined,
    redirect: 'manual',
  });

  const res = await fetch(upstreamReq);
  const contentType = res.headers.get('Content-Type') || '';
  const responseHeaders = new Headers(res.headers);
  const c = corsHeaders(origin);
  for (const [k, v] of Object.entries(c))
    responseHeaders.set(k, v as string);
  responseHeaders.set('X-Request-Id', requestId);
  applySecurityHeaders(responseHeaders);

  if (contentType.includes('application/json')) {
    const bodyText = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return new Response(bodyText, {
        status: res.status,
        headers: responseHeaders,
      });
    }
    const wrapped = res.ok
      ? {
          success: true,
          data: parsed,
          requestId,
          timestamp: new Date().toISOString(),
        }
      : {
          success: false,
          error: {
            code: (parsed as any)?.code || 'SUPABASE_ERROR',
            message:
              (parsed as any)?.message || res.statusText,
            requestId,
          },
          timestamp: new Date().toISOString(),
        };
    return new Response(JSON.stringify(wrapped), {
      status: res.ok ? 200 : res.status,
      headers: responseHeaders,
    });
  }

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Determine nearest Supabase replica based on x-supabase-region or CF-Region header
    const explicitRegion =
      request.headers.get('x-supabase-region') ||
      request.headers.get('X-Supabase-Region') ||
      undefined;
    const cfRegion =
      ((request as any).cf?.region as string | undefined) ||
      request.headers.get('CF-Region') ||
      request.headers.get('cf-region') ||
      undefined;
    const regionHint = (explicitRegion || cfRegion || '').toUpperCase();

    // Read queries (GET, HEAD) can route to regional read replicas.
    // Mutating operations (POST, PUT, PATCH, DELETE) MUST always route to primary SUPABASE_URL.
    const isReadOperation = request.method === 'GET' || request.method === 'HEAD';
    let supabaseUrl = env.SUPABASE_URL;
    let resolvedRegion = 'primary';

    if (isReadOperation && regionHint) {
      if (regionHint.startsWith('EU')) {
        supabaseUrl = env.SUPABASE_URL_EU || env.SUPABASE_URL;
        if (env.SUPABASE_URL_EU) resolvedRegion = 'replica-eu';
      } else if (regionHint.startsWith('US')) {
        supabaseUrl = env.SUPABASE_URL_US || env.SUPABASE_URL;
        if (env.SUPABASE_URL_US) resolvedRegion = 'replica-us';
      }
    }
    // expose for downstream utils
    (globalThis as any).SUPABASE_URL = supabaseUrl;

    const incomingTrace = request.headers.get('x-trace-id') || request.headers.get('X-Trace-Id');
    const rawReqId = request.headers.get('x-request-id') || request.headers.get('X-Request-Id') || incomingTrace;
    const isSafeReqId = rawReqId && /^[a-zA-Z0-9_\-\.]{1,64}$/.test(rawReqId);
    const requestId = isSafeReqId
      ? rawReqId
      : ("req_" + Date.now() + "_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)));
    const traceId = incomingTrace || requestId;
    (globalThis as any).SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    (globalThis as any).SUPABASE_JWKS_URL =
      env.SUPABASE_JWKS_URL;

    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      const preflightRes = handleCorsPreflightRequest(request);
      preflightRes.headers.set('X-Request-Id', requestId);
      return preflightRes;
    }

    const allowedSuffixes = ((env as any).ALLOWED_ORIGIN_SUFFIXES ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (origin && !isOriginAllowed(origin, allowedSuffixes)) {
      const h = new Headers({ 'Content-Type': 'application/json' });
      h.set('X-Request-Id', requestId);
      h.set('x-request-id', requestId);
      h.set('x-trace-id', traceId);
      applySecurityHeaders(h);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden origin' },
          timestamp: new Date().toISOString(),
          correlationId: requestId,
        }),
        {
          status: 403,
          headers: h,
        },
      );
    }

    const pathname = url.pathname;
    const strippedPath = stripApiPrefix(pathname);

    // POST /stories/{id}/view -> increment view counter (supports /api/v1/stories/:id/view and /api/stories/:id/view)
    const viewMatch = strippedPath.match(/^\/stories\/([^\/]+)\/view$/);
    if (request.method === 'POST' && viewMatch) {
      let role = getAuthRole(request);
      if (!role && request.headers.has('Authorization')) {
        try {
          const authUser = await validateJWT(request.headers.get('Authorization')!, env);
          role = authUser.role;
        } catch {
          // invalid jwt token
        }
      }
      if (!role) {
        return new Response(
          JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
          {
            status: 401,
            headers: (() => {
              const h = new Headers({ 'Content-Type': 'application/json', ...corsHeaders(origin) });
              h.set('x-request-id', requestId);
              h.set('x-trace-id', traceId);
              applySecurityHeaders(h);
              return h;
            })(),
          },
        );
      }
      if (!requireActionRole(role)) {
        return new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          {
            status: 403,
            headers: (() => {
              const h = new Headers({ 'Content-Type': 'application/json', ...corsHeaders(origin) });
              h.set('x-request-id', requestId);
              h.set('x-trace-id', traceId);
              applySecurityHeaders(h);
              return h;
            })(),
          },
        );
      }
      const storyId = viewMatch[1];
      const res = await incrementStoryView(env, storyId, true);
      const h = new Headers(corsHeaders(origin));
      h.set('x-request-id', requestId);
      h.set('x-trace-id', traceId);
      applySecurityHeaders(h);
      return new Response(null, { status: res.status, headers: h });
    }

    // Real traffic telemetry -> Analytics Engine (non-blocking, best-effort).
    // blobs: [hostname, device, pathname]; index: 'request'.
    recordAnalyticsEngineEvent(env, {
      indexes: ['request'],
      blobs: [
        url.hostname,
        detectDevice(request.headers.get('User-Agent') || ''),
        pathname,
      ],
      doubles: [Date.now()],
    });

    if (request.method === 'GET' && (strippedPath === '' || strippedPath === '/' || strippedPath === '/health' || pathname === '/api/health')) {
      const h = new Headers({
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-trace-id': traceId,
        ...corsHeaders(origin),
      });
      applySecurityHeaders(h);
      return new Response(
        JSON.stringify({
          status: 'ok',
          worker: 'kv-worker',
          requestId,
          timestamp: new Date().toISOString(),
          correlationId: requestId,
        }),
        {
          status: 200,
          headers: h,
        },
      );
    }

    // Durable Object atomic hot counters (/increment, /get)
    if (
      strippedPath === '/increment' ||
      strippedPath === '/get' ||
      strippedPath === '/counters/increment' ||
      strippedPath === '/counters/get'
    ) {
      if (env.COUNTER_DO) {
        const entityId = url.searchParams.get('id') || 'global';
        const id = env.COUNTER_DO.idFromName(entityId);
        const stub = env.COUNTER_DO.get(id);
        const doRes = await stub.fetch(request);
        const h = new Headers(doRes.headers);
        for (const [k, v] of Object.entries(corsHeaders(origin))) {
          h.set(k, v);
        }
        h.set('x-request-id', requestId);
        h.set('x-trace-id', traceId);
        applySecurityHeaders(h);
        return new Response(doRes.body, { status: doRes.status, headers: h });
      }
      return new Response(
        JSON.stringify({ success: false, error: 'COUNTER_DO_NOT_CONFIGURED' }),
        {
          status: 503,
          headers: (() => {
            const h = new Headers({ 'Content-Type': 'application/json', ...corsHeaders(origin) });
            h.set('x-request-id', requestId);
            h.set('x-trace-id', traceId);
            applySecurityHeaders(h);
            return h;
          })(),
        },
      );
    }
    const isAuthOrAdmin =
      strippedPath.startsWith('/admin') ||
      strippedPath.startsWith('/auth') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/auth');

    const authHeader = request.headers.get('Authorization') ?? '';
    let authCtx = null;
    if (authHeader) {
      try {
        authCtx = await validateJWT(authHeader, env);
      } catch (e) {
        // If route is protected/admin or non-GET write operation, enforce 401
        if (isAuthOrAdmin || (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS')) {
          if (e instanceof UnauthorizedError) {
            const h = new Headers({
              'Content-Type': 'application/json',
              'X-Request-Id': requestId,
              'x-request-id': requestId,
              'x-trace-id': traceId,
              ...corsHeaders(origin),
            });
            applySecurityHeaders(h);
            return new Response(
              JSON.stringify({
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: e.message,
                  requestId,
                },
                timestamp: new Date().toISOString(),
                correlationId: requestId,
              }),
              { status: 401, headers: h },
            );
          }
          const h = new Headers({
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
            'x-request-id': requestId,
            'x-trace-id': traceId,
            ...corsHeaders(origin),
          });
          applySecurityHeaders(h);
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId },
              timestamp: new Date().toISOString(),
              correlationId: requestId,
            }),
            { status: 500, headers: h },
          );
        }
        // For public GET requests, log warning and allow unauthenticated fallback
        console.warn('Ignored invalid/expired token on public GET request:', (e as Error).message);
        authCtx = null;
      }
    }

    const userRole = authCtx?.role;
    const rateLimit = await checkRateLimit(request, isAuthOrAdmin, userRole, pathname, env.APP_KV);

    if (!rateLimit.allowed) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.resetSec),
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': '0',
        'X-Request-Id': requestId,
        'x-request-id': requestId,
        'x-trace-id': traceId,
        ...corsHeaders(origin),
      });
      applySecurityHeaders(headers);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Please try again later.', requestId },
          timestamp: new Date().toISOString(),
          correlationId: requestId,
        }),
        { status: 429, headers },
      );
    }

    const method = request.method;

    // Check Idempotency for write requests
    const idempotency = await checkIdempotency(request, env.APP_KV, origin, authCtx?.userId);
    if (idempotency.hit && idempotency.response) {
      const hitHeaders = new Headers(idempotency.response.headers);
      hitHeaders.set('x-request-id', requestId);
      hitHeaders.set('x-trace-id', traceId);
      return new Response(idempotency.response.body, {
        status: idempotency.response.status,
        headers: hitHeaders,
      });
    }

    const isPublicWrite = strippedPath === '/stories/views';
    if (method !== 'GET' && method !== 'OPTIONS' && !authCtx && !isPublicWrite) {
      const h = new Headers({
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'x-request-id': requestId,
        'x-trace-id': traceId,
        ...corsHeaders(origin),
      });
      applySecurityHeaders(h);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required for write operations', requestId },
          timestamp: new Date().toISOString(),
          correlationId: requestId,
        }),
        {
          status: 401,
          headers: h,
        },
      );
    }

    if (
      strippedPath.startsWith('/supabase/') ||
      strippedPath.startsWith('/rpc/')
    ) {
      return handleSupabaseProxy(pathname, request, origin, env, requestId);
    }

    const responseHeaders = new Headers();
    const c = corsHeaders(origin);
    for (const [k, v] of Object.entries(c))
      responseHeaders.set(k, v as string);

    const downstreamHeaders = new Headers(request.headers);
    downstreamHeaders.delete('x-user-role');
    downstreamHeaders.delete('x-user-id');
    downstreamHeaders.delete('x-user-email');
    downstreamHeaders.set('x-request-id', requestId);
    downstreamHeaders.set('X-Request-Id', requestId);
    downstreamHeaders.set('x-trace-id', traceId);
    downstreamHeaders.set('x-begin-timestamp', String(Date.now()));
    if (authCtx) {
      downstreamHeaders.set('Authorization', authHeader);
      downstreamHeaders.set('x-user-id', authCtx.userId);
      downstreamHeaders.set('x-user-role', authCtx.role);
      if (authCtx.email)
        downstreamHeaders.set('x-user-email', authCtx.email);
    } else {
      downstreamHeaders.delete('Authorization');
    }
    downstreamHeaders.set('x-forwarded-by', 'unified-gateway');

    let res: Response | null = null;

    const createForwardRequest = (targetUrl: string) => {
      const isBodyAllowed = method !== 'GET' && method !== 'HEAD';
      const hasBody = isBodyAllowed && request.body !== null && request.body !== undefined;
      return new Request(targetUrl, {
        method: request.method,
        headers: downstreamHeaders,
        body: isBodyAllowed ? (request.body ?? undefined) : undefined,
        ...(hasBody ? { duplex: 'half' as any } : {}),
      });
    };

    // Route to appropriate handler
    if (
      strippedPath.startsWith('/stories') ||
      strippedPath.startsWith('/chapters') ||
      strippedPath.startsWith('/categories')
    ) {
      res = await handleStoriesRequest(
        createForwardRequest(url.toString()),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    } else if (strippedPath.startsWith('/comics')) {
      res = await handleComicsRequest(
        createForwardRequest(url.toString()),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    // ── Public media file serving (secure & sanitized) ────────
    } else if (method === 'GET' && strippedPath.startsWith('/media/')) {
      const bucket = env.R2_BUCKET;
      if (!bucket) {
        console.error('[Media] R2 binding missing', {
          event: 'media_r2_not_configured',
          requestId: downstreamHeaders.get('x-request-id'),
        });
        res = err('R2_NOT_CONFIGURED', 'R2 bucket not bound', 500);
      } else {
        // Security: decode and sanitize against path traversal attacks (..)
        let rawKey = strippedPath.replace('/media/', '');
        try {
          rawKey = decodeURIComponent(rawKey);
        } catch {
          // ignore malformed URI components
        }
        rawKey = rawKey.replace(/\\/g, '/').replace(/\/\//g, '/');

        if (rawKey.includes('..') || rawKey.startsWith('/')) {
          console.warn('[Media] rejected key', {
            event: 'media_key_rejected',
            key: rawKey.slice(0, 500),
            requestId: downstreamHeaders.get('x-request-id'),
          });
          res = err('BAD_REQUEST', 'Invalid key path', 400);
        } else {
          const edgeCache = typeof caches !== 'undefined' ? (caches as any)?.default : undefined;
          let edgeCachedRes: Response | null = null;
          if (edgeCache) {
            edgeCachedRes = await edgeCache.match(request).catch(() => null);
          }

          if (edgeCachedRes) {
            res = edgeCachedRes;
          } else {
            const ifNoneMatch = request.headers.get('if-none-match');

            // ponytail: images are served as full 200s, Range ignored on purpose.
            // Chrome's sniff probes (Range: bytes=0-…) get ORB-blocked when the
            // worker answers 206 partials (truncated image sniff fails -> retry
            // storm -> CLS). The admin r2/file route keeps range support.
            const object = await bucket.get(rawKey, conditionalGetOptions(ifNoneMatch));
            const outcome = classifyR2Get(object);

            if (outcome.kind === 'missing') {
              const isMasked = rawKey.endsWith('.cbz') || rawKey.endsWith('.dat');
              const fallback = await handleTieringFallback({
                key: rawKey,
                gdriveFallbackUrl: (env as any).GDRIVE_FALLBACK_URL,
                bucket,
                ctx,
                isMasked,
              });
              if (fallback.found && fallback.response) {
                res = fallback.response;
              } else {
                console.warn('[Media] object not found', {
                  event: 'media_not_found',
                  key: rawKey.slice(0, 500),
                  requestId: downstreamHeaders.get('x-request-id'),
                });
                res = err('NOT_FOUND', 'File not found', 404);
              }
            } else if (outcome.kind === 'not-modified') {
              const notModified = new Headers();
              if (outcome.etag) notModified.set('etag', outcome.etag);
              notModified.set('cache-control', 'public, max-age=31536000, immutable');
              res = new Response(null, { status: 304, headers: notModified });
            } else {
              const body = object as R2ObjectBody;
              const mediaHeaders = new Headers();
              mediaHeaders.set('cache-control', body.httpMetadata?.cacheControl || 'public, max-age=31536000, immutable');
              mediaHeaders.set('content-type', body.httpMetadata?.contentType || 'application/octet-stream');
              mediaHeaders.set('etag', body.httpEtag);
              mediaHeaders.set('accept-ranges', 'bytes');
              mediaHeaders.set('x-content-type-options', 'nosniff');
              mediaHeaders.set('cross-origin-resource-policy', 'cross-origin');
              mediaHeaders.set('x-request-id', downstreamHeaders.get('x-request-id') ?? '');
              mediaHeaders.set('content-length', body.size.toString());
              res = new Response(body.body, { status: 200, headers: mediaHeaders });
            }

            if (edgeCache && res && res.status === 200 && ctx && typeof ctx.waitUntil === 'function') {
              ctx.waitUntil(edgeCache.put(request, res.clone()).catch(() => {}));
            }
          }
        }
      }
    } else if (strippedPath === '/admin/site-settings' && method === 'GET' && url.searchParams.get('scope') === 'public') {
      const svcKey = env.SUPABASE_SERVICE_KEY;
      if (!svcKey) {
        res = err('NOT_CONFIGURED', 'Service key not configured', 500);
      } else {
        try {
          let q = 'select=key,value&or=(key.like.public_%,key.like.ad_%)';
          const sbUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
          const supRes = await fetch(`${sbUrl}/rest/v1/site_settings?${q}`, {
            headers: {
              apikey: svcKey,
              Authorization: `Bearer ${svcKey}`,
            },
          });
          if (!supRes.ok && supRes.status >= 500) {
            res = json({ success: true, data: [] });
          } else if (!supRes.ok) {
            res = err('UPSTREAM', await supRes.text(), supRes.status);
          } else {
            const text = await supRes.text();
            res = json({ success: true, data: text ? JSON.parse(text) : [] });
          }
        } catch {
          res = json({ success: true, data: [] });
        }
      }
    } else if (strippedPath.startsWith('/admin')) {
      if (!authCtx && !strippedPath.startsWith('/admin/public')) {
        res = err('UNAUTHORIZED', 'Authentication required', 401);
      } else {
        res = await handleAdminRequest(
          createForwardRequest(url.toString()),
          env,
          authToken(downstreamHeaders),
          strippedPath,
        );
      }
    } else if (strippedPath.startsWith('/analytics')) {
      res = await handleAnalyticsRequest(
        createForwardRequest(url.toString()),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    } else if (strippedPath.startsWith('/user')) {
      res = await handleUserRequest(
        createForwardRequest(url.toString()),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    } else if (strippedPath.startsWith('/hyperdrive')) {
      res = await handleHyperdriveRequest(
        createForwardRequest(url.toString()),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    }

    if (!res) {
      res = err('NOT_FOUND', `No route: ${request.method} ${pathname}`, 404);
    }

    // Save idempotency cache if request is a successful mutation with Idempotency-Key
    if (env.APP_KV && res.ok && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      ctx.waitUntil(saveIdempotency(request, res, env.APP_KV, authCtx?.userId));
    }

    const resHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(c))
      resHeaders.set(k, v as string);
    resHeaders.set('x-request-id', requestId);
    resHeaders.set('X-Request-Id', requestId);
    resHeaders.set('x-trace-id', traceId);
    applySecurityHeaders(resHeaders);

    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const bodyText = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        return new Response(bodyText, {
          status: res.status,
          headers: resHeaders,
        });
      }
      const obj = parsed as Record<string, unknown>;
      if (obj && typeof obj.success === 'boolean') {
        if (!obj.timestamp || !obj.correlationId) {
          const augmented = {
            ...obj,
            timestamp: obj.timestamp || new Date().toISOString(),
            correlationId: obj.correlationId || requestId,
          };
          return new Response(JSON.stringify(augmented), {
            status: res.status,
            headers: resHeaders,
          });
        }
        return new Response(bodyText, {
          status: res.status,
          headers: resHeaders,
        });
      }
      const wrapped = res.ok
        ? {
            success: true,
            data: parsed,
            requestId,
            timestamp: new Date().toISOString(),
            correlationId: requestId,
          }
        : {
            success: false,
            error: {
              code:
                (obj as any)?.error?.code ||
                'WORKER_ERROR',
              message:
                (obj as any)?.error?.message ||
                res.statusText,
              requestId,
              ...((obj as any)?.error?.details ? { details: (obj as any).error.details } : {}),
            },
            timestamp: new Date().toISOString(),
            correlationId: requestId,
          };
      return new Response(JSON.stringify(wrapped), {
        status: res.ok ? 200 : res.status,
        headers: resHeaders,
      });
    }

    return new Response(res.body, {
      status: res.status,
      headers: resHeaders,
    });
  },

  async queue(
    batch: MessageBatch<any>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    for (const message of batch.messages) {
      try {
        const payload = message.body;
        console.log(`[Queue] Processing message ${message.id} (type: ${payload?.type || 'UNKNOWN'}):`, payload);

        if (payload?.type === 'CACHE_INVALIDATION' && payload?.key && env.APP_KV) {
          await env.APP_KV.delete(payload.key);
          console.log(`[Queue] Invalidated KV key: ${payload.key}`);
        } else if (payload?.type === 'ANALYTICS_EVENT') {
          console.log(`[Queue] Ingested analytics event for comic: ${payload?.comicId || 'N/A'}`);
        } else if (payload?.type === 'AUDIT_EVENT') {
          console.log(`[Queue] Recorded audit log for action: ${payload?.action || 'N/A'}`);
        }

        message.ack();
      } catch (err) {
        console.error(`[Queue] Error processing message ${message.id}:`, err);
        message.retry();
      }
    }
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const { syncViews } = await import('../../../scripts/redis_sync');
    await syncViews(env);
  },
};

// ponytail: Cloudflare Workflows durable execution handler
export class LightStoryWorkflow extends WorkflowEntrypoint<Env, { action: string }> {
  async run(event: Readonly<WorkflowEvent<{ action: string }>>, step: WorkflowStep) {
    const res = await step.do('execute-pipeline-step', async () => {
      return { status: 'completed', action: event.payload?.action || 'default', timestamp: new Date().toISOString() };
    });
    return res;
  }
}

// Durable Object atomic counter class export for Cloudflare Workers runtime
export { CounterDO } from './do/counter.do';
