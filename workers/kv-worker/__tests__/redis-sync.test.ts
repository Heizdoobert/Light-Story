import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import scheduledWorker, { syncViews } from '../../../scripts/redis_sync';
import { fakeKV } from '../src/__tests__/helpers/fake-kv';

function createEnv(kv: KVNamespace): Env {
  return {
    APP_KV: kv,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
  } as unknown as Env;
}

describe('redis-sync', () => {
  let kv: ReturnType<typeof fakeKV>;
  let env: Env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    kv = fakeKV();
    env = createEnv(kv);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('syncs view counts to Supabase RPC and deletes synced KV keys', async () => {
    await kv.put('view:story-1', '25');
    await kv.put('view:story-2', '42');

    const rpcCalls: Array<{ url: string; body: any }> = [];
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      rpcCalls.push({
        url: url.toString(),
        body: init?.body ? JSON.parse(init.body as string) : null,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as any;

    await syncViews(env);

    expect(rpcCalls).toHaveLength(2);
    expect(rpcCalls).toEqual(
      expect.arrayContaining([
        {
          url: 'https://test.supabase.co/rest/v1/rpc/increment_story_views',
          body: { story_id_param: 'story-1', inc: 25 },
        },
        {
          url: 'https://test.supabase.co/rest/v1/rpc/increment_story_views',
          body: { story_id_param: 'story-2', inc: 42 },
        },
      ]),
    );

    // Verify keys were deleted
    expect(await kv.get('view:story-1')).toBeNull();
    expect(await kv.get('view:story-2')).toBeNull();
  });

  it('runs successfully via scheduled handler', async () => {
    await kv.put('view:story-scheduled', '99');

    const rpcCalls: any[] = [];
    globalThis.fetch = vi.fn(async (_url, init) => {
      rpcCalls.push(init?.body ? JSON.parse(init.body as string) : null);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as any;

    await scheduledWorker.scheduled(
      { scheduledTime: Date.now(), cron: '0 2 * * *' } as ScheduledEvent,
      env,
      {} as ExecutionContext,
    );

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]).toEqual({ story_id_param: 'story-scheduled', inc: 99 });
    expect(await kv.get('view:story-scheduled')).toBeNull();
  });
});
