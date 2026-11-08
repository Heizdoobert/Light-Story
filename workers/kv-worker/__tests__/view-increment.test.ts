import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
  WorkflowEvent: class {},
  WorkflowStep: class {},
}));

import worker from '../src/index';
import { incrementStoryView } from '../src/counters';
import { fakeKV } from '../src/__tests__/helpers/fake-kv';

function createTestEnv(kv: KVNamespace): Env {
  return {
    APP_KV: kv,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
  } as unknown as Env;
}

const mockCtx: ExecutionContext = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
} as unknown as ExecutionContext;

describe('view-increment', () => {
  let kv: ReturnType<typeof fakeKV>;
  let env: Env;

  beforeEach(() => {
    kv = fakeKV();
    env = createTestEnv(kv);
  });

  it('returns 204 and increments KV counter on POST /api/v1/stories/:id/view', async () => {
    const req = new Request('http://localhost/api/v1/stories/story-123/view', {
      method: 'POST',
      headers: {
        'x-user-role': 'user',
      },
    });

    const res = await worker.fetch(req, env, mockCtx);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');

    const val = await kv.get('view:story-123');
    expect(String(val)).toBe('1');

    // Second call increments to 2
    const res2 = await worker.fetch(req, env, mockCtx);
    expect(res2.status).toBe(204);
    expect(await res2.text()).toBe('');
    const val2 = await kv.get('view:story-123');
    expect(String(val2)).toBe('2');
  });

  it('supports /api/stories/:id/view without v1 prefix', async () => {
    const req = new Request('http://localhost/api/stories/story-alt/view', {
      method: 'POST',
      headers: {
        'x-user-role': 'user',
      },
    });

    const res = await worker.fetch(req, env, mockCtx);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');

    const val = await kv.get('view:story-alt');
    expect(String(val)).toBe('1');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const req = new Request('http://localhost/api/v1/stories/story-123/view', {
      method: 'POST',
    });

    const res = await worker.fetch(req, env, mockCtx);
    expect(res.status).toBe(401);
  });

  it('rejects forbidden roles with 403', async () => {
    const req = new Request('http://localhost/api/v1/stories/story-123/view', {
      method: 'POST',
      headers: {
        'x-user-role': 'guest_forbidden',
      },
    });

    const res = await worker.fetch(req, env, mockCtx);
    expect(res.status).toBe(403);
  });

  it('incrementStoryView returns JSON response when called directly', async () => {
    const res = await incrementStoryView(env, 'story-direct');
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; count: number };
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);

    const val = await kv.get('view:story-direct');
    expect(String(val)).toBe('1');
  });
});
