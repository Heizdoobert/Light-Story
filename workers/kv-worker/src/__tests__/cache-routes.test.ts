import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleStoriesRequest } from '../routes/stories';
import { fakeKV } from './helpers/fake-kv';

function envWith(kv: KVNamespace): Env {
  return {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    APP_KV: kv,
  } as unknown as Env;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /categories', () => {
  it('returns the same body on a cache hit as on a cache miss', async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    let upstreamCalls = 0;

    vi.stubGlobal('fetch', async () => {
      upstreamCalls++;
      return Response.json([{ id: '1', name: 'Action' }]);
    });

    const req = new Request('https://gateway.test/api/categories');

    const first = await handleStoriesRequest(req, env, null, '/categories');
    expect(first).toBeInstanceOf(Response);
    expect(await first!.json()).toEqual([{ id: '1', name: 'Action' }]);

    const second = await handleStoriesRequest(req, env, null, '/categories');
    expect(second).toBeInstanceOf(Response);
    expect(await second!.json()).toEqual([{ id: '1', name: 'Action' }]);

    // The second request was served from KV, not from Supabase.
    expect(upstreamCalls).toBe(1);
  });
});
