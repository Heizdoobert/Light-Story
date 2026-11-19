import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
}));

import worker from '../index';
import { isLoopbackHost, isLoopbackOrigin } from '../middleware/cors';
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

describe('loopback CORS origins', () => {
  it('rejects a GET from a localhost origin on a production host', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const req = new Request('https://gateway.example.com/api/v1/stories', {
      method: 'GET',
      headers: { Origin: 'http://localhost:3000' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a preflight from a localhost origin on a production host', async () => {
    const req = new Request('https://gateway.example.com/api/v1/stories', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('allows a preflight from a localhost origin when the worker runs locally', async () => {
    const req = new Request('http://localhost:8787/api/v1/stories', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('still allows a preflight from the production origin', async () => {
    const req = new Request('https://gateway.example.com/api/v1/stories', {
      method: 'OPTIONS',
      headers: { Origin: 'https://lightstory.app' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(204);
  });
});

describe('isLoopbackOrigin', () => {
  it.each([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000',
    'http://[::1]:3000',
  ])('returns true for %s', (origin) => {
    expect(isLoopbackOrigin(origin)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isLoopbackOrigin(null)).toBe(false);
  });

  it.each(['https://lightstory.app', 'not a url', 'http://localhost.evil.com'])(
    'returns false for %s',
    (origin) => {
      expect(isLoopbackOrigin(origin)).toBe(false);
    },
  );
});

describe('isLoopbackHost', () => {
  it.each(['http://localhost:8787/x', 'http://127.0.0.1:8787/x'])(
    'returns true for %s',
    (url) => {
      expect(isLoopbackHost(url)).toBe(true);
    },
  );

  it.each(['https://gateway.example.com/x', 'not a url'])('returns false for %s', (url) => {
    expect(isLoopbackHost(url)).toBe(false);
  });
});
