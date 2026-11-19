import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
}));

import worker from '../index';
import { fakeKV } from './helpers/fake-kv';

const fakeEnv = {
  APP_KV: fakeKV(),
  ALLOWED_ORIGIN_SUFFIXES: 'lightstory.app',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
};
const fakeCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /stories/:id/view authentication', () => {
  it('ignores a client-supplied x-user-role header without a JWT', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const req = new Request('https://gateway.example.com/api/v1/stories/abc/view', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer token even with a forged role header', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [] }), { status: 200 })));
    const req = new Request('https://gateway.example.com/api/stories/abc/view', {
      method: 'POST',
      headers: { 'x-user-role': 'user', Authorization: 'Bearer not.a.jwt' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(401);
  });
});
