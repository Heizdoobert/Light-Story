import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue(undefined);
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(undefined);
  vi.unstubAllEnvs();
});

describe('getPrivilegedAuthHeaders', () => {
  it('returns auth header when session has access_token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok1' } } });

    const { getPrivilegedAuthHeaders } = await import('./requestAuth');
    const headers = await getPrivilegedAuthHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer tok1' });
  });

  it('returns empty when no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { getPrivilegedAuthHeaders } = await import('./requestAuth');
    const headers = await getPrivilegedAuthHeaders();
    expect(headers).toEqual({});
  });
});

describe('getPrivilegedAuthHeadersWithInternal', () => {
  it('returns auth headers when available', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok2' } } });

    const { getPrivilegedAuthHeadersWithInternal } = await import('./requestAuth');
    const headers = await getPrivilegedAuthHeadersWithInternal();
    expect(headers).toEqual({ Authorization: 'Bearer tok2' });
  });

  it('falls back to internal secret header', async () => {
    mockGetUser.mockRejectedValue(new Error('no user'));
    vi.stubEnv('NEXT_PUBLIC_INTERNAL_ADMIN_SECRET', 'my-secret');

    const { getPrivilegedAuthHeadersWithInternal } = await import('./requestAuth');
    const headers = await getPrivilegedAuthHeadersWithInternal();
    expect(headers).toEqual({ 'x-internal-secret': 'my-secret' });
  });

  it('returns empty when everything fails', async () => {
    mockGetUser.mockRejectedValue(new Error('fail'));
    vi.stubEnv('NEXT_PUBLIC_INTERNAL_ADMIN_SECRET', '');

    const { getPrivilegedAuthHeadersWithInternal } = await import('./requestAuth');
    const headers = await getPrivilegedAuthHeadersWithInternal();
    expect(headers).toEqual({});
  });
});