import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiClient.get', () => {
  it('sends GET request and returns data on success', async () => {
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ data: [{ id: 1 }] }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    const { apiClient } = await import('./apiClient');
    const result = await apiClient.get('/test');
    expect(result).toEqual([{ id: 1 }]);
    expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toContain('/test');
  });

  it('throws ApiError on HTTP error', async () => {
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ error: { message: 'Not Found' }, code: 'NOT_FOUND' }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', text: mockJson });

    const { apiClient, ApiError } = await import('./apiClient');
    await expect(apiClient.get('/missing')).rejects.toThrow(ApiError);
    await expect(apiClient.get('/missing')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('throws ApiError on API-level success:false', async () => {
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ success: false, error: { message: 'Invalid', code: 'VALIDATION' } }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    const { apiClient, ApiError } = await import('./apiClient');
    await expect(apiClient.get('/bad')).rejects.toThrow(ApiError);
    await expect(apiClient.get('/bad')).rejects.toMatchObject({ status: 200, code: 'VALIDATION' });
  });
});

describe('apiClient.post', () => {
  it('sends POST with JSON body', async () => {
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ data: { id: 42 } }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    const { apiClient } = await import('./apiClient');
    const result = await apiClient.post('/create', { name: 'test' });
    expect(result).toEqual({ id: 42 });
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(call[1]).toMatchObject({ method: 'POST' });
  });
});

describe('apiClient.put', () => {
  it('sends PUT request', async () => {
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ data: { updated: true } }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    const { apiClient } = await import('./apiClient');
    const result = await apiClient.put('/update', { val: 1 });
    expect(result).toEqual({ updated: true });
    expect(vi.mocked(globalThis.fetch).mock.calls[0][1]).toMatchObject({ method: 'PUT' });
  });
});

describe('apiClient.patch', () => {
  it('sends PATCH request', async () => {
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ data: { patched: true } }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    const { apiClient } = await import('./apiClient');
    const result = await apiClient.patch('/patch', { val: 1 });
    expect(result).toEqual({ patched: true });
    expect(vi.mocked(globalThis.fetch).mock.calls[0][1]).toMatchObject({ method: 'PATCH' });
  });
});

describe('apiClient.delete', () => {
  it('sends DELETE request', async () => {
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ data: { deleted: true } }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    const { apiClient } = await import('./apiClient');
    const result = await apiClient.delete('/remove');
    expect(result).toEqual({ deleted: true });
    expect(vi.mocked(globalThis.fetch).mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });
});

describe('isTokenExpired (through getAccessToken)', () => {
  it('uses stored token when available', async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ exp: future, sub: 'u1' }));
    localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: `x.${payload}.z` }));

    const { apiClient } = await import('./apiClient');
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ data: 'ok' }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    await apiClient.get('/test');
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(call![1]!.headers).toBeInstanceOf(Headers);
  });

  it('falls back when localStorage token is expired', async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const payload = btoa(JSON.stringify({ exp: past, sub: 'u1' }));
    localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: `x.${payload}.z` }));

    const { supabase } = await import('@/infrastructure/supabase/client');
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'refreshed', refresh_token: 'r', expires_in: 3600, token_type: 'bearer', user: { id: 'u1', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } } }, error: null });

    const { apiClient } = await import('./apiClient');
    const mockJson = vi.fn().mockResolvedValue(JSON.stringify({ data: 'ok' }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: mockJson });

    await apiClient.get('/test');
    expect(vi.mocked(supabase!.auth.getSession)).toHaveBeenCalled();
  });
});