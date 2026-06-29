import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

function makeExpiredToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const payload = btoa(JSON.stringify({ sub: 'user-1', exp: 0 }));
  return `${header}.${payload}.sig`;
}

function makeValidToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const payload = btoa(JSON.stringify({ sub: 'user-1', exp: 9999999999 }));
  return `${header}.${payload}.sig`;
}

const mockSupabase = {
  auth: { getSession: vi.fn() },
};

const mockApiClient = {
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/infrastructure/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('@/lib/apiClient', () => ({ apiClient: mockApiClient }));

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getAccessToken', () => {
  it('returns null when no token exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const { getAccessToken } = await import('./comic.service');
    const token = await getAccessToken();
    expect(token).toBeNull();
  });

  it('returns valid token from localStorage', async () => {
    const validToken = makeValidToken();
    localStorage.setItem('sb-abc-auth-token', JSON.stringify({ access_token: validToken }));

    const { getAccessToken } = await import('./comic.service');
    const token = await getAccessToken();
    expect(token).toBe(validToken);
  });

  it('falls back to supabase getSession when localStorage token is expired', async () => {
    const expiredToken = makeExpiredToken();
    localStorage.setItem('sb-abc-auth-token', JSON.stringify({ access_token: expiredToken }));

    const validToken = makeValidToken();
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: validToken } } });

    const { getAccessToken } = await import('./comic.service');
    const token = await getAccessToken();
    expect(token).toBe(validToken);
    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
  });
});

describe('uploadComicCover', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' });
    vi.stubEnv('NEXT_PUBLIC_R2_BUCKET_COVERS', 'covers-bucket');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', 'https://gateway.test');
  });

  it('uploads file and returns URL from response', async () => {
    const validToken = makeValidToken();
    localStorage.setItem('sb-abc-auth-token', JSON.stringify({ access_token: validToken }));

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { urls: ['https://r2.test/cover.jpg'] } }),
    } as Response);

    const { uploadComicCover } = await import('./comic.service');
    const url = await uploadComicCover(new File(['test'], 'cover.png'));

    expect(url).toBe('https://r2.test/cover.jpg');
    expect(fetch).toHaveBeenCalledWith(
      'https://gateway.test/api/admin/upload-to-r2',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${validToken}`,
          'x-r2-bucket': 'covers-bucket',
        }),
      }),
    );
  });

  it('throws when response has error', async () => {
    localStorage.setItem('sb-abc-auth-token', JSON.stringify({ access_token: makeValidToken() }));

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Upload failed' } }),
    } as Response);

    const { uploadComicCover } = await import('./comic.service');
    await expect(uploadComicCover(new File(['test'], 'cover.png'))).rejects.toThrow('Upload failed');
  });
});

describe('createComic', () => {
  it('sends POST to /api/comics and returns comic', async () => {
    mockApiClient.post.mockResolvedValue({ comic: { id: 'c1', title: 'Test' } });

    const { createComic } = await import('./comic.service');
    const result = await createComic({ title: 'Test', description: 'Desc', coverUrl: 'https://img.test' });

    expect(result.title).toBe('Test');
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/comics', {
      title: 'Test',
      description: 'Desc',
      cover_url: 'https://img.test',
      author: 'Unknown',
      status: 'ongoing',
      category: [],
    });
  });
});
