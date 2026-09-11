import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
    }
  }
  return { NextResponse: MockNextResponse };
});

vi.mock('@/lib/supabase/server', () => ({
  default: vi.fn(),
}));

import { GET } from '@/app/api/health/route';
import getServerSupabase from '@/lib/supabase/server';

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function mockSupabase(overrides: { data?: unknown; error?: unknown } = {}) {
  const select = vi.fn().mockResolvedValue({
    data: overrides.data ?? [{ id: 'test' }],
    error: overrides.error ?? null,
  });
  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ limit: select }) });
  return { from };
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('returns 200 with status ok and ISO timestamp', async () => {
    vi.mocked(getServerSupabase).mockReturnValue(null as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body.status).toBe('ok');
    expect(body.worker).toBe('kv-worker');
    expect(ISO_REGEX.test(body.timestamp)).toBe(true);
  });

  it('returns database unconfigured in test environment (skips DB probe)', async () => {
    vi.mocked(getServerSupabase).mockReturnValue(mockSupabase() as never);
    const res = await GET();
    const body = await res.json() as Record<string, string>;
    expect(body.database).toBe('unconfigured');
  });

  it('returns database healthy when supabase query succeeds', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getServerSupabase).mockReturnValue(mockSupabase() as never);
    const res = await GET();
    const body = await res.json() as Record<string, string>;
    expect(body.database).toBe('healthy');
    expect(res.status).toBe(200);
  });

  it('returns 503 when database is unhealthy', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getServerSupabase).mockReturnValue(
      mockSupabase({ error: { message: 'connection refused' } }) as never
    );
    const res = await GET();
    const body = await res.json() as Record<string, string>;
    expect(body.database).toBe('unhealthy');
    expect(res.status).toBe(503);
  });

  it('returns database unreachable when supabase throws', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getServerSupabase).mockImplementation(() => {
      throw new Error('DB connection failed');
    });
    const res = await GET();
    const body = await res.json() as Record<string, string>;
    expect(body.database).toBe('unreachable');
    expect(res.status).toBe(503);
  });

  it('skips DB probe in test environment', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const mockDb = mockSupabase();
    vi.mocked(getServerSupabase).mockReturnValue(mockDb as never);
    const res = await GET();
    const body = await res.json() as Record<string, string>;
    expect(body.database).toBe('unconfigured');
    expect(mockDb.from).not.toHaveBeenCalled();
  });

  it('returns distinct timestamps across calls', async () => {
    vi.mocked(getServerSupabase).mockReturnValue(null as never);
    const a = await (await GET()).json() as Record<string, string>;
    await new Promise((r) => setTimeout(r, 2));
    const b = await (await GET()).json() as Record<string, string>;
    expect(a.timestamp).not.toBe(b.timestamp);
  });

  it('exposes only GET method', async () => {
    const route = await import('@/app/api/health/route');
    expect(route.GET).toBeDefined();
    expect((route as Record<string, unknown>).POST).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
    expect((route as Record<string, unknown>).PATCH).toBeUndefined();
  });
});
