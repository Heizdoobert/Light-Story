/// <reference types="@cloudflare/workers-types" />
/// <reference path="../workers/kv-worker/worker-configuration.d.ts" />

// Minimal Redis sync script
// Iterates KV keys with prefix 'view:' and syncs counts to Supabase

export async function syncViews(env: Env) {
  if (!env.APP_KV) return;
  const list = await env.APP_KV.list({ prefix: 'view:' });
  for (const key of list.keys) {
    const storyId = key.name.split(':')[1];
    const val = await env.APP_KV.get(key.name);
    const count = val ? parseInt(val, 10) : 0;
    if (count > 0) {
      // Sync via RPC (assumes existing RPC)
      const sbUrl = (globalThis as any).SUPABASE_URL || env.SUPABASE_URL;
      await fetch(`${sbUrl}/rest/v1/rpc/increment_story_views`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ story_id_param: storyId, inc: count }),
      });
    }
    // delete key after sync
    await env.APP_KV.delete(key.name);
  }
}

// When executed as a worker entry (e.g., via Cron Trigger)
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await syncViews(env);
  },
};
