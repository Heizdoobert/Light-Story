/** Unified Gateway - Main entry point */

import {
  err,
  json,
  authToken,
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
import { handleComicsRequest } from './routes/comics';
import { handleAdminRequest } from './routes/admin';
import { handleAnalyticsRequest } from './routes/analytics';
import { handleUserRequest } from './routes/user';
import { handleHyperdriveRequest } from './routes/hyperdrive';
import { checkRateLimit } from './middleware/rateLimit';
import { applySecurityHeaders } from './middleware/securityHeaders';

async function handleSupabaseProxy(
  pathname: string,
  request: Request,
  origin: string | null,
  env: Env,
): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: { code: 'SUPABASE_NOT_CONFIGURED' },
      }),
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
    return new Response(
      JSON.stringify({
        status: 'error',
        error: { code: 'INVALID_SUPABASE_PATH' },
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      },
    );
  }

  const targetUrl = `${env.SUPABASE_URL}${sbPath}`;
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
  headers.delete('x-request-id');
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
          timestamp: new Date().toISOString(),
        }
      : {
          success: false,
          error: {
            code: (parsed as any)?.code || 'SUPABASE_ERROR',
            message:
              (parsed as any)?.message || res.statusText,
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
    _ctx: ExecutionContext,
  ): Promise<Response> {
    (globalThis as any).SUPABASE_URL = env.SUPABASE_URL;
    (globalThis as any).SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    (globalThis as any).SUPABASE_JWKS_URL =
      env.SUPABASE_JWKS_URL;

    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest(request);
    }

    if (origin && !isOriginAllowed(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    const pathname = url.pathname;
    const isAuthOrAdmin = pathname.startsWith('/api/admin') || pathname.startsWith('/api/auth');

    const authHeader = request.headers.get('Authorization') ?? '';
    let authCtx = null;
    if (authHeader) {
      try {
        authCtx = await validateJWT(authHeader, env);
      } catch (e) {
        // If route is protected/admin or non-GET write operation, enforce 401
        if (isAuthOrAdmin || (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS')) {
          if (e instanceof UnauthorizedError) {
            return new Response(
              JSON.stringify({
                status: 'error',
                error: {
                  code: 'UNAUTHORIZED',
                  message: e.message,
                },
              }),
              {
                status: 401,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders(origin),
                },
              },
            );
          }
          return new Response(
            JSON.stringify({
              status: 'error',
              error: { code: 'INTERNAL_ERROR' },
            }),
            { status: 500 },
          );
        }
        // For public GET requests, log warning and allow unauthenticated fallback
        console.warn('Ignored invalid/expired token on public GET request:', (e as Error).message);
        authCtx = null;
      }
    }

    const userRole = authCtx?.role;
    const rateLimit = checkRateLimit(request, isAuthOrAdmin, userRole, pathname);

    if (!rateLimit.allowed) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.resetSec),
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': '0',
        ...corsHeaders(origin),
      });
      applySecurityHeaders(headers);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Please try again later.' },
        }),
        { status: 429, headers },
      );
    }

    const strippedPath = stripApiPrefix(pathname);
    const method = request.method;

    if (method !== 'GET' && method !== 'OPTIONS' && !authCtx) {
      return new Response(
        JSON.stringify({
          status: 'error',
          error: { code: 'UNAUTHORIZED', message: 'Authentication required for write operations' },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        },
      );
    }

    if (
      strippedPath.startsWith('/supabase/') ||
      strippedPath.startsWith('/rpc/')
    ) {
      return handleSupabaseProxy(pathname, request, origin, env);
    }

    const responseHeaders = new Headers();
    const c = corsHeaders(origin);
    for (const [k, v] of Object.entries(c))
      responseHeaders.set(k, v as string);

    const downstreamHeaders = new Headers(request.headers);
    downstreamHeaders.delete('x-user-role');
    downstreamHeaders.delete('x-user-id');
    downstreamHeaders.delete('x-user-email');
    downstreamHeaders.set(
      'x-request-id',
      crypto.randomUUID(),
    );
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
      return new Request(targetUrl, {
        method: request.method,
        headers: downstreamHeaders,
        body: isBodyAllowed ? (request.body ?? undefined) : undefined,
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
          res = err('BAD_REQUEST', 'Invalid key path', 400);
        } else {
          const rangeHeader = request.headers.get('range');
          const ifNoneMatch = request.headers.get('if-none-match');

          const options: R2GetOptions = {};
          if (rangeHeader) options.range = request.headers;
          if (ifNoneMatch) options.onlyIf = { etagMatches: ifNoneMatch };

          const object = await bucket.get(rawKey, options);
          if (!object) {
            if (ifNoneMatch) {
              res = new Response(null, { status: 304 });
            } else {
              res = err('NOT_FOUND', 'File not found', 404);
            }
          } else {
            const mediaHeaders = new Headers();
            mediaHeaders.set('cache-control', object.httpMetadata?.cacheControl || 'public, max-age=31536000, immutable');
            if (object.httpMetadata?.contentType) {
              mediaHeaders.set('content-type', object.httpMetadata.contentType);
            } else {
              mediaHeaders.set('content-type', 'application/octet-stream');
            }
            mediaHeaders.set('etag', object.httpEtag);
            mediaHeaders.set('accept-ranges', 'bytes');
            mediaHeaders.set('x-content-type-options', 'nosniff');
            mediaHeaders.set('cross-origin-resource-policy', 'cross-origin');

            if (object.range) {
              const r = object.range as { offset?: number; length?: number };
              const offset = r.offset ?? 0;
              const length = r.length ?? object.size;
              mediaHeaders.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
              mediaHeaders.set('content-length', length.toString());
              res = new Response(object.body, { status: 206, headers: mediaHeaders });
            } else {
              mediaHeaders.set('content-length', object.size.toString());
              res = new Response(object.body, { status: 200, headers: mediaHeaders });
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
          let q = 'select=key,value&key=like.public_%';
          const supRes = await fetch(`${env.SUPABASE_URL}/rest/v1/site_settings?${q}`, {
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
    } else if (strippedPath.startsWith('/hyperdrive-test')) {
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

    const resHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(c))
      resHeaders.set(k, v as string);
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
      if (obj && (typeof obj.success === 'boolean' || obj.status === 'error')) {
        return new Response(bodyText, {
          status: res.status,
          headers: resHeaders,
        });
      }
      const wrapped = res.ok
        ? {
            success: true,
            data: parsed,
            timestamp: new Date().toISOString(),
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
            },
            timestamp: new Date().toISOString(),
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
    _env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    for (const message of batch.messages) {
      try {
        console.log(`[Queue] Processing message ${message.id}:`, message.body);
        message.ack();
      } catch (err) {
        console.error(`[Queue] Error processing message ${message.id}:`, err);
        message.retry();
      }
    }
  },
};
