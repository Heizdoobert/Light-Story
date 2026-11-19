import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
}));

import worker from '../index';
import { SUPABASE_TIMEOUT_MS } from '../utils/supabase-client';

const fakeCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('worker top-level error boundary', () => {
  it('returns a generic JSON 500 without error details when the handler throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = new Proxy({}, {
      get() {
        throw new Error('secret-internal-detail at /src/index.ts:42');
      },
    });
    const req = new Request('https://gateway.example.com/api/v1/stories', {
      headers: { Origin: 'https://lightstory.app' },
    });
    const res = await worker.fetch(req, env as any, fakeCtx as any);
    expect(res.status).toBe(500);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    const text = await res.text();
    expect(text).not.toContain('secret-internal-detail');
    expect(JSON.parse(text)).toMatchObject({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal error' } });
  });

  it('bounds Supabase REST calls with a timeout', () => {
    expect(SUPABASE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SUPABASE_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });
});
