import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedError, validateJWT } from '../middleware/auth';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_KEY: 'service',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_JWKS_URL: 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
};

function forgedToken(sub: string): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = b64({ alg: 'RS256', typ: 'JWT', kid: 'nope' });
  // role: 'authenticated' is what a real Supabase access token carries, and it
  // is exactly the value that forces the profiles lookup in validateJWT. A
  // token with no role claim defaults to 'user', skips the lookup, and would
  // make this test pass without proving anything.
  const payload = b64({
    sub,
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return `${header}.${payload}.AAAA`;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as any).__JWKS_CACHE__;
});

describe('validateJWT ordering', () => {
  it('rejects a forged token without querying the profiles table', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('jwks.json')) {
        return new Response(JSON.stringify({ keys: [] }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      validateJWT(forgedToken('11111111-2222-3333-4444-555555555555'), env),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const profileCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0] instanceof Request ? (c[0] as Request).url : c[0]).includes('/rest/v1/profiles'),
    );
    expect(profileCalls).toHaveLength(0);
  });

  it('does not leave a role cache entry for a forged sub', async () => {
    const sub = '99999999-8888-7777-6666-555555555555';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ keys: [] }), { status: 200 })),
    );

    await expect(validateJWT(forgedToken(sub), env)).rejects.toBeInstanceOf(UnauthorizedError);
    expect((globalThis as any)[`__PROFILE_ROLE_${sub}__`]).toBeUndefined();
  });
});
