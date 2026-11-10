/** Idempotency-Key middleware for write operations */

import { corsHeaders } from './cors';
import { applySecurityHeaders } from './securityHeaders';
import { logEvent } from '../utils/logger';

export interface IdempotencyResult {
  hit: boolean;
  response?: Response;
}

export async function checkIdempotency(
  request: Request,
  kv?: KVNamespace,
  origin?: string | null,
  userId?: string,
): Promise<IdempotencyResult> {
  const method = request.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { hit: false };
  }

  const idemKey =
    request.headers.get('Idempotency-Key') ||
    request.headers.get('X-Idempotency-Key');
  if (!idemKey || !kv) return { hit: false };

  const storageKey = `idempotency:${userId || 'anon'}:${idemKey.trim()}`;
  try {
    const cached = (await kv.get(storageKey, 'json')) as {
      status: number;
      headers: Record<string, string>;
      body: unknown;
    } | null;

    if (cached) {
      await logEvent(null, 'idempotency_hit', { storageKey, userId, method }, { level: 'info' });
      const h = new Headers(cached.headers);
      h.set('X-Cache-Lookup', 'HIT-IDEMPOTENT');
      const c = corsHeaders(origin ?? null);
      for (const [k, v] of Object.entries(c)) {
        h.set(k, v as string);
      }
      applySecurityHeaders(h);
      return {
        hit: true,
        response: new Response(
          typeof cached.body === 'string'
            ? cached.body
            : JSON.stringify(cached.body),
          { status: cached.status, headers: h },
        ),
      };
    }
    await logEvent(null, 'idempotency_miss', { storageKey, userId, method }, { level: 'debug' });
  } catch (err) {
    await logEvent(null, 'idempotency_read_error', { storageKey, error: (err as Error).message }, { level: 'warn' });
    console.warn('[Idempotency] Failed reading cache:', err);
  }

  return { hit: false };
}

export async function saveIdempotency(
  request: Request,
  response: Response,
  kv?: KVNamespace,
  userId?: string,
): Promise<void> {
  const idemKey =
    request.headers.get('Idempotency-Key') ||
    request.headers.get('X-Idempotency-Key');
  if (!idemKey || !kv || !response.ok) return;

  const storageKey = `idempotency:${userId || 'anon'}:${idemKey.trim()}`;
  try {
    const cloned = response.clone();
    const contentType = cloned.headers.get('Content-Type') || '';
    let body: unknown;
    if (contentType.includes('application/json')) {
      body = await cloned.json();
    } else {
      body = await cloned.text();
    }

    await kv.put(
      storageKey,
      JSON.stringify({
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/json',
        },
        body,
      }),
      { expirationTtl: 86400 }, // 24 hours
    );
    await logEvent(null, 'idempotency_saved', { storageKey, userId, status: response.status }, { level: 'info' });
  } catch (err) {
    await logEvent(null, 'idempotency_save_error', { storageKey, error: (err as Error).message }, { level: 'warn' });
    console.warn('[Idempotency] Failed saving response to cache:', err);
  }
}
