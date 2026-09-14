/** CORS and request handling middleware */

import { applySecurityHeaders } from './securityHeaders';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://0.0.0.0:3000',
  'https://lightstory.app',
  'https://staging.lightstory.app',
];

/**
 * Preview deployments are opt-in via ALLOWED_ORIGIN_SUFFIXES (comma-separated
 * hostnames). The previous rule accepted any *.vercel.app host, which let any
 * third party's free deployment through the gate with credentials enabled.
 * Matching is exact-host or dot-boundary, so "evil-lightstory.app" does not
 * match a "lightstory.app" entry.
 */
export function isOriginAllowed(
  origin: string | null,
  allowedSuffixes: string[] = [],
): boolean {
  if (!origin) return true; // allow non-browser / curl requests
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  let hostname: string;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  return allowedSuffixes.some((raw) => {
    const suffix = raw.trim().toLowerCase();
    if (!suffix) return false;
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  });
}

const DEFAULT_ALLOWED_HEADERS =
  'Authorization, Content-Type, apikey, Prefer, x-r2-bucket, x-request-id, x-user-role, x-user-id, x-user-email';

export function corsHeaders(
  origin: string | null,
  requestHeaders?: string | null,
) {
  const allowed = origin && isOriginAllowed(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods':
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      requestHeaders || DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Expose-Headers':
      'x-request-id, x-begin-timestamp, content-range',
    'Access-Control-Allow-Credentials': allowed !== '*' ? 'true' : 'false',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function handleCorsPreflightRequest(
  request: Request,
): Response {
  const origin = request.headers.get('Origin');
  const reqHeaders = request.headers.get('Access-Control-Request-Headers');
  const headers = new Headers(corsHeaders(origin, reqHeaders));
  applySecurityHeaders(headers);
  return new Response(null, {
    status: 204,
    headers,
  });
}

export function stripApiPrefix(pathname: string): string {
  return pathname.replace(/^\/api\/?v?\d*\/?/i, '/');
}

export function supabaseProxyPath(pathname: string): string | null {
  const match = pathname.match(
    /^\/api\/supabase\/(rest|auth|storage)(\/v\d+\/.*)$/i,
  );
  if (match) return `/${match[1]}${match[2]}`;
  const rpcMatch = pathname.match(/^\/api\/rpc\/(.+)$/i);
  if (rpcMatch) return `/rest/v1/rpc/${rpcMatch[1]}`;
  return null;
}
