import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleAdminRequest } from '../routes/admin';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_KEY: 'service',
} as unknown as Env;

// Minimal unsigned JWT: header.payload.signature, payload carries sub.
const SUB = '11111111-2222-3333-4444-555555555555';
const TOKEN = ['e30', btoa(JSON.stringify({ sub: SUB })).replace(/=+$/, ''), 'sig'].join('.');

function promoteRequest(): Request {
  return new Request('https://gateway.test/api/admin/promote', {
    method: 'POST',
    headers: { 'x-user-role': 'user' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /admin/promote', () => {
  it('refuses to promote when the existing-admin count cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('upstream down', { status: 503 })),
    );

    const res = await handleAdminRequest(promoteRequest(), env, TOKEN, '/admin/promote');

    expect(res?.status).toBe(503);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1); // count only, no RPC
  });

  it('refuses to promote when an admin already exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(null, { status: 200, headers: { 'content-range': '0-0/1' } }),
      ),
    );

    const res = await handleAdminRequest(promoteRequest(), env, TOKEN, '/admin/promote');

    expect(res?.status).toBe(403);
  });

  it('promotes the first caller when no admin exists', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('/rest/v1/profiles')) {
        return new Response(null, { status: 200, headers: { 'content-range': '*/0' } });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await handleAdminRequest(promoteRequest(), env, TOKEN, '/admin/promote');

    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
