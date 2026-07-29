import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

beforeEach(() => { vi.clearAllMocks(); });

function makeJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-sig`;
}

describe('verifyTokenNotExpired', () => {
  it('returns true for valid unexpired token', async () => {
    const { verifyTokenNotExpired } = await import('./auth-middleware');
    const farFuture = Math.floor(Date.now() / 1000) + 86400;
    expect(verifyTokenNotExpired(makeJWT({ exp: farFuture, sub: 'u1' }))).toBe(true);
  });

  it('returns false for expired token', async () => {
    const { verifyTokenNotExpired } = await import('./auth-middleware');
    const farPast = Math.floor(Date.now() / 1000) - 86400;
    expect(verifyTokenNotExpired(makeJWT({ exp: farPast, sub: 'u1' }))).toBe(false);
  });

  it('returns false for malformed token', async () => {
    const { verifyTokenNotExpired } = await import('./auth-middleware');
    expect(verifyTokenNotExpired('not-a-jwt')).toBe(false);
  });

  it('returns true when exp is missing', async () => {
    const { verifyTokenNotExpired } = await import('./auth-middleware');
    expect(verifyTokenNotExpired(makeJWT({ sub: 'u1' }))).toBe(true);
  });
});

describe('getAuthToken', () => {
  it('returns token from session', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    const { getAuthToken } = await import('./auth-middleware');
    expect(await getAuthToken()).toBe('tok-1');
  });

  it('returns null when no session', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    const { getAuthToken } = await import('./auth-middleware');
    expect(await getAuthToken()).toBeNull();
  });

  it('returns null on error', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockRejectedValue(new Error('fail'));
    const { getAuthToken } = await import('./auth-middleware');
    expect(await getAuthToken()).toBeNull();
  });
});

describe('getAuthHeaders', () => {
  it('returns Authorization header when token exists', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    const { getAuthHeaders } = await import('./auth-middleware');
    const headers = await getAuthHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer tok-1' });
  });

  it('returns empty object when no token', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    const { getAuthHeaders } = await import('./auth-middleware');
    expect(await getAuthHeaders()).toEqual({});
  });
});

describe('isAuthenticated', () => {
  it('returns true for valid session with unexpired token', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    const farFuture = Math.floor(Date.now() / 1000) + 86400;
    const token = makeJWT({ exp: farFuture });
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: token } } });
    const { isAuthenticated } = await import('./auth-middleware');
    expect(await isAuthenticated()).toBe(true);
  });

  it('returns false when no token', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    const { isAuthenticated } = await import('./auth-middleware');
    expect(await isAuthenticated()).toBe(false);
  });
});

describe('getUserId', () => {
  it('returns user id from session', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: { user: { id: 'u-123' } } } });
    const { getUserId } = await import('./auth-middleware');
    expect(await getUserId()).toBe('u-123');
  });

  it('returns null when no session', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    const { getUserId } = await import('./auth-middleware');
    expect(await getUserId()).toBeNull();
  });

  it('returns null on error', async () => {
    const supabase = (await import('@/infrastructure/supabase/client')).supabase;
    (supabase!.auth.getSession as any).mockRejectedValue(new Error('fail'));
    const { getUserId } = await import('./auth-middleware');
    expect(await getUserId()).toBeNull();
  });
});