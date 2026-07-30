import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => ({ status: init?.status ?? 200, body }) },
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

vi.mock('@/lib/api/server', () => ({ createClient: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ getServerSupabaseForRequest: vi.fn(), getServerSupabase: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); });

describe('isAllowedRouteRole', () => {
  it('returns true for superadmin regardless of allowed list', async () => {
    const { isAllowedRouteRole } = await import('./routeAuth');
    expect(isAllowedRouteRole('superadmin')).toBe(true);
    expect(isAllowedRouteRole('superadmin', ['user'])).toBe(true);
  });

  it('returns true for role in allowed list', async () => {
    const { isAllowedRouteRole } = await import('./routeAuth');
    expect(isAllowedRouteRole('admin')).toBe(true);
    expect(isAllowedRouteRole('internal')).toBe(true);
  });

  it('returns false for role not in allowed list', async () => {
    const { isAllowedRouteRole } = await import('./routeAuth');
    expect(isAllowedRouteRole('user')).toBe(false);
  });
});

describe('resolveRouteRequester', () => {
  it('returns internal requester when secret header matches', async () => {
    vi.stubEnv('INTERNAL_ADMIN_SECRET', 'secret-42');
    const { resolveRouteRequester } = await import('./routeAuth');
    const request = { headers: { get: (name: string) => name === 'x-internal-secret' ? 'secret-42' : null } } as any;

    const result = await resolveRouteRequester(request);
    expect(result).toEqual({ ok: true, id: 'internal', role: 'internal' });
    vi.unstubAllEnvs();
  });

  it('accepts anonymous fallback', async () => {
    const { resolveRouteRequester } = await import('./routeAuth');
    const request = { headers: { get: () => null } } as any;

    const result = await resolveRouteRequester(request, { allowAnonymousFallback: true });
    expect(result).toEqual({ ok: true, id: 'anonymous', role: 'employee' });
  });

  it('returns ok:false when all methods fail and no fallback', async () => {
    const { resolveRouteRequester } = await import('./routeAuth');
    const request = { headers: { get: () => null } } as any;

    const result = await resolveRouteRequester(request);
    expect(result).toEqual({ ok: false });
  });
});

describe('requireRouteAuthorization', () => {
  it('returns unauthorized response when resolve fails', async () => {
    const { requireRouteAuthorization } = await import('./routeAuth');
    const request = { headers: { get: () => null } } as any;

    const result = await requireRouteAuthorization(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns forbidden for disallowed role', async () => {
    const { requireRouteAuthorization } = await import('./routeAuth');
    const request = { headers: { get: () => null } } as any;

    const result = await requireRouteAuthorization(request, { allowedRoles: ['superadmin'], allowAnonymousFallback: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });
});