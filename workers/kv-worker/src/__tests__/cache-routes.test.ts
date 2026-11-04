import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleStoriesRequest } from '../routes/stories';
import { handleComicRecommendations, handleComicsRequest } from '../routes/comics';
import { l1Cache } from '../middleware/cache';
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
  l1Cache.clear();
});

describe('GET /categories', () => {
  it('returns the same body on a cache hit as on a cache miss and sets public Cache-Control', async () => {
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
    expect(first?.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=600, stale-while-revalidate=30');
    expect(await first!.json()).toEqual([{ id: '1', name: 'Action' }]);

    const second = await handleStoriesRequest(req, env, null, '/categories');
    expect(second).toBeInstanceOf(Response);
    expect(second?.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=600, stale-while-revalidate=30');
    expect(await second!.json()).toEqual([{ id: '1', name: 'Action' }]);

    // The second request was served from KV, not from Supabase.
    expect(upstreamCalls).toBe(1);
  });
});

describe('cache isolation between callers', () => {
  it('does not serve an authenticated caller rows from the anonymous cache and sets private Cache-Control', async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    const bodies = [
      [{ id: '1', name: 'Public' }],
      [{ id: '1', name: 'Public' }, { id: '2', name: 'Staff only' }],
    ];
    let call = 0;

    vi.stubGlobal('fetch', async () => Response.json(bodies[Math.min(call++, 1)]));

    const req = new Request('https://gateway.test/api/categories');

    // Anonymous caller populates the cache.
    const anon = await handleStoriesRequest(req, env, null, '/categories');
    expect(anon?.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=600, stale-while-revalidate=30');
    expect(await anon!.json()).toEqual(bodies[0]);

    // Authenticated caller must reach Supabase, not the anonymous cache entry.
    const staff = await handleStoriesRequest(req, env, 'staff-token', '/categories');
    expect(staff?.headers.get('Cache-Control')).toBe('private, no-cache');
    expect(await staff!.json()).toEqual(bodies[1]);
    expect(call).toBe(2);
  });
});

describe('GET /comics/recommendations', () => {
  it('rejects a comicId that is not a UUID', async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    let upstreamCalls = 0;
    vi.stubGlobal('fetch', async () => {
      upstreamCalls++;
      return Response.json([]);
    });

    const url = new URL('https://gateway.test/api/comics/recommendations?comicId=abc&select=*');
    const res = await handleComicRecommendations(url, env, null);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    // The rejected id must not have reached Supabase...
    expect(upstreamCalls).toBe(0);
    // ...nor become a cache key.
    expect(kv.store.size).toBe(0);
  });

  it('still serves generic recommendations when no comicId is given and sets Cache-Control', async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    vi.stubGlobal('fetch', async () => Response.json([{ id: '1', title: 'Top' }]));

    const url = new URL('https://gateway.test/api/comics/recommendations');
    const res = await handleComicRecommendations(url, env, null);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=300, stale-while-revalidate=30');
  });
});

describe('GET /stories and GET /comics public caching', () => {
  it('sets 60s Cache-Control for anonymous story list reads', async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    vi.stubGlobal('fetch', async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('select=count')) {
        return new Response(JSON.stringify([{ count: 1 }]), {
          status: 200,
          headers: { 'Content-Range': '0-0/1' },
        });
      }
      return Response.json([{ id: '1', title: 'Story' }]);
    });

    const req = new Request('https://gateway.test/api/stories');
    const res = await handleStoriesRequest(req, env, null, '/stories');

    expect(res?.status).toBe(200);
    expect(res?.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=60, stale-while-revalidate=30');
  });

  it('sets 60s Cache-Control for anonymous comic list reads', async () => {
    const kv = fakeKV();
    const env = envWith(kv);
    vi.stubGlobal('fetch', async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('select=count')) {
        return new Response(JSON.stringify([{ count: 1 }]), {
          status: 200,
          headers: { 'Content-Range': '0-0/1' },
        });
      }
      return Response.json([{ id: '1', title: 'Comic' }]);
    });

    const req = new Request('https://gateway.test/api/comics');
    const res = await handleComicsRequest(req, env, null, '/comics');

    expect(res?.status).toBe(200);
    expect(res?.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=60, stale-while-revalidate=30');
  });
});
