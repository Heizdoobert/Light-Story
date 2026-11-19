import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getSession: async () => ({ data: { session: null } }) } })),
}));

import { assertSafeApiPath, fetchApi } from '@/actions/http';

describe('assertSafeApiPath', () => {
  it.each([
    '/api/admin/categories/abc-123',
    '/api/admin/users/6f1c2a90-1111-4222-8333-944445555666',
    '/api/stories?q=a%2Fb',
  ])('accepts %s', (path) => {
    expect(() => assertSafeApiPath(path)).not.toThrow();
  });

  it.each([
    '/api/admin/categories/../users/victim',
    '/api/admin/categories/..',
    '/api/admin/categories/./x',
    '/api/admin/categories/%2e%2e/users',
    '/api/admin/categories/a%2Fb',
    '/api/admin/categories/a\\b',
    '//evil.example/api',
    'api/no-leading-slash',
  ])('rejects %s', (path) => {
    expect(() => assertSafeApiPath(path)).toThrow('Unsafe API path');
  });

  it('fetchApi refuses traversal before any network call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(fetchApi('/api/admin/categories/../users/x', { method: 'DELETE' })).rejects.toThrow('Unsafe API path');
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
