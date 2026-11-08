/// <reference types="@cloudflare/workers-types" />
/// <reference path="../workers/kv-worker/worker-configuration.d.ts" />

// Minimal Redis sync script
// Iterates KV keys with prefix 'view:' and syncs counts to Supabase

export async function syncViews(env: Env): Promise<void> {
  if (!env.APP_KV) return;

  let currentCursor: string | undefined = undefined;
  let complete = false;
  while (!complete) {
    const listResult: KVNamespaceListResult<unknown> = await env.APP_KV.list(
      currentCursor ? { prefix: 'view:', cursor: currentCursor } : { prefix: 'view:' }
    );
    for (const key of listResult.keys) {
      const storyId = key.name.startsWith('view:') ? key.name.slice(5) : key.name;
      const val = await env.APP_KV.get(key.name);
      const count = val ? parseInt(val, 10) : 0;
      if (count > 0) {
        const sbUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
        try {
          const res = await fetch(`${sbUrl}/rest/v1/rpc/increment_story_views`, {
            method: 'POST',
            headers: {
              apikey: env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ story_id_param: storyId, inc: count }),
          });
          if (!res.ok) {
            console.error(`[RedisSync] Failed RPC for ${storyId}: ${res.status}`);
            continue; // Prevent data loss: retain KV key on RPC error
          }
        } catch (e) {
          console.error(`[RedisSync] Network error for ${storyId}:`, e);
          continue; // Prevent data loss: retain KV key on network failure
        }
      }
      await env.APP_KV.delete(key.name);
    }
    complete = listResult.list_complete;
    currentCursor = listResult.list_complete ? undefined : (listResult as any).cursor;
  }
}

// When executed as a worker entry (e.g., via Cron Trigger)
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await syncViews(env);
  },
};
