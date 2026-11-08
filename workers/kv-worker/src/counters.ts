// Counter utilities for story view hot counter using Workers KV
// This file provides functions to increment a view counter in KV and sync to Supabase.

export async function incrementStoryView(
  env: Env,
  storyId: string,
  asHandler: boolean | { asHandler?: boolean } = false,
): Promise<Response> {
  const isHandler = typeof asHandler === 'boolean' ? asHandler : !!asHandler?.asHandler;
  if (!env.APP_KV) {
    return isHandler
      ? new Response(null, { status: 500 })
      : new Response(JSON.stringify({ success: false, error: 'KV_NOT_CONFIGURED' }), { status: 500 });
  }
  const kvKey = `view:${storyId}`;
  // Increment the counter atomically using KV's add operation (string stored as number)
  const current = await env.APP_KV.get(kvKey);
  const count = current ? parseInt(current as any, 10) + 1 : 1;
  await env.APP_KV.put(kvKey, count.toString());

  // If we reached sync threshold, write to Supabase and reset the KV counter
  if (count >= 1000) {
    // Call Supabase RPC to increment story views (assumes existing rpc)
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
    // Reset KV counter regardless of RPC success (best‑effort)
    await env.APP_KV.put(kvKey, '0');
    if (isHandler) {
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify({ success: true, synced: count }), { status: 200 });
  }

  if (isHandler) {
    return new Response(null, { status: 204 });
  }
  return new Response(JSON.stringify({ success: true, count }), { status: 200 });
}
