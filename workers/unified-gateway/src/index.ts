/** Unified Gateway - Main entry point */

import {
  Env,
  json,
  err,
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

  const upstreamReq = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.body ?? undefined,
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
      return handleCorsPreflightRequest(origin);
    }

    if (origin && !isOriginAllowed(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    const pathname = url.pathname;
    if (
      pathname.startsWith('/api/supabase/') ||
      pathname.startsWith('/api/rpc/')
    ) {
      return handleSupabaseProxy(pathname, request, origin, env);
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    let authCtx = null;
    try {
      if (authHeader)
        authCtx = await validateJWT(authHeader);
    } catch (e) {
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

    const strippedPath = stripApiPrefix(pathname);
    const method = request.method;

    // Reject unauthenticated mutations
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

    const responseHeaders = new Headers();
    const c = corsHeaders(origin);
    for (const [k, v] of Object.entries(c))
      responseHeaders.set(k, v as string);

    const downstreamHeaders = new Headers(request.headers);
    downstreamHeaders.set(
      'x-request-id',
      crypto.randomUUID(),
    );
    downstreamHeaders.set('x-begin-timestamp', String(Date.now()));
    if (authHeader) {
      downstreamHeaders.set('Authorization', authHeader);
    }
    if (authCtx) {
      downstreamHeaders.set('x-user-id', authCtx.userId);
      downstreamHeaders.set('x-user-role', authCtx.role);
      if (authCtx.email)
        downstreamHeaders.set('x-user-email', authCtx.email);
    }
    downstreamHeaders.set('x-forwarded-by', 'unified-gateway');

    let res: Response | null = null;

    // Route to appropriate handler
    if (
      strippedPath.startsWith('/stories') ||
      strippedPath.startsWith('/chapters')
    ) {
      res = await handleStoriesRequest(
        new Request(url.toString(), {
          method: request.method,
          headers: downstreamHeaders,
          body: request.body ?? undefined,
        }),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    } else if (strippedPath.startsWith('/comics')) {
      res = await handleComicsRequest(
        new Request(url.toString(), {
          method: request.method,
          headers: downstreamHeaders,
          body: request.body ?? undefined,
        }),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    } else if (strippedPath.startsWith('/admin')) {
      res = await handleAdminRequest(
        new Request(url.toString(), {
          method: request.method,
          headers: downstreamHeaders,
          body: request.body ?? undefined,
        }),
        env,
        authToken(downstreamHeaders),
        strippedPath,
      );
    } else if (strippedPath.startsWith('/analytics')) {
      res = await handleAnalyticsRequest(
        new Request(url.toString(), {
          method: request.method,
          headers: downstreamHeaders,
          body: request.body ?? undefined,
        }),
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
                (parsed as any)?.error?.code ||
                'WORKER_ERROR',
              message:
                (parsed as any)?.error?.message ||
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
};
