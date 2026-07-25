/** CORS and request handling middleware */

import type { Env } from '../utils/supabase-client';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://0.0.0.0:3000',
  'https://lightstory.app',
  'https://staging.lightstory.app',
];

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // allow non-browser / curl requests
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  return false;
}

export function corsHeaders(origin: string | null) {
  const allowed = origin && isOriginAllowed(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods':
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, x-r2-bucket',
    'Access-Control-Expose-Headers':
      'x-request-id, x-begin-timestamp',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function handleCorsPreflightRequest(
  origin: string | null,
): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
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
