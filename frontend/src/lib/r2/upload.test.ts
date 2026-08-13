import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/constants/routes', () => ({
  ROUTES: { API: { R2_UPLOAD: '/api/r2/upload' } },
}));

import { uploadToR2 } from './upload';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadToR2', () => {
  it('returns url on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ url: 'chapters/a.jpg' }), { status: 200 })));
    const res = await uploadToR2(new File(['x'], 'a.jpg'));
    expect(res).toEqual({ success: true, url: 'chapters/a.jpg' });
  });

  it('surfaces status and server detail on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('File too large', { status: 413 })));
    const res = await uploadToR2(new File(['x'], 'a.jpg'));
    expect(res.success).toBe(false);
    expect(res.error).toContain('413');
    expect(res.error).toContain('File too large');
  });

  it('retries once on network error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'chapters/a.jpg' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await uploadToR2(new File(['x'], 'a.jpg'));
    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 4xx', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await uploadToR2(new File(['x'], 'a.jpg'));
    expect(res.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
