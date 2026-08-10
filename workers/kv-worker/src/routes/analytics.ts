/** Analytics endpoint handler */

import {
  err,
  sbGet,
  sbRpc,
  handleRes,
  json,
  recordAnalyticsEngineEvent,
} from '../utils/supabase-client';

export async function handleAnalyticsRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method;

  try {
    if (method === 'GET' && pathname === '/analytics/overview') {
      const totalRes = await sbGet('stories', 'select=id', env, token);
      const totalData = await totalRes.json();
      const totalStories = Array.isArray(totalData)
        ? totalData.length
        : 0;
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 86400000,
      ).toISOString();
      const recentChapters = await sbGet(
        'chapters',
        `select=id&created_at=gte.${sevenDaysAgo}`,
        env,
        token,
      );
      const chaptersData = recentChapters.ok
        ? await recentChapters.json()
        : [];
      const chaptersCount = Array.isArray(chaptersData)
        ? (chaptersData as any[]).length
        : 0;
      return json({
        totalStories,
        recentChapters: chaptersCount,
        generatedAt: new Date().toISOString(),
      });
    }

    if (
      method === 'GET' &&
      pathname === '/analytics/engagement'
    ) {
      const daysBack = parseInt(
        url.searchParams.get('days') || '30',
      );
      const res = await sbRpc(
        'get_user_engagement_summary',
        { p_days_back: daysBack },
        env,
        token,
      );
      return handleRes(res);
    }

    if (
      method === 'GET' &&
      pathname === '/analytics/top-stories'
    ) {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const res = await sbGet(
        'stories',
        `select=id,title,author,views,like_count&order=views.desc&limit=${limit}`,
        env,
        token,
      );
      return handleRes(res);
    }

    if (
      method === 'GET' &&
      pathname === '/analytics/infrastructure'
    ) {
      let r2ObjectCount = 0;
      let r2SizeBytes = 0;

      if (env.R2_BUCKET) {
        let cursor: string | undefined = undefined;
        do {
          const listRes: any = await env.R2_BUCKET.list({ cursor, limit: 1000 });
          r2ObjectCount += listRes.objects.length;
          for (const obj of listRes.objects) {
            r2SizeBytes += obj.size || 0;
          }
          cursor = listRes.truncated ? listRes.cursor : undefined;
        } while (cursor);
      }

      let queueBacklog = 0;
      if (env.LIGHTSTORY_QUEUE) {
        try {
          const qm = await env.LIGHTSTORY_QUEUE.metrics();
          queueBacklog = Number(qm.backlogCount ?? 0);
        } catch (_) {}
      }

      const r2UsageGb = Number((r2SizeBytes / (1024 * 1024 * 1024)).toFixed(4));
      // ponytail: R2 free tier cap (10 GB) is the real plan constant, not telemetry.
      const r2AllocatedGb = 10;
      const storageEfficiencyPct =
        r2AllocatedGb > 0 ? Number(((r2UsageGb / r2AllocatedGb) * 100).toFixed(2)) : 0;

      // Real data only: R2 live listing, queue metrics() and binding presence.
      // Analytics Engine (page views, device split, cache hit, zones) is not enabled
      // on this account — those fields were hardcoded fakes and are now removed.
      return json({
        r2_usage_gb: r2UsageGb,
        r2_allocated_gb: r2AllocatedGb,
        r2_object_count: r2ObjectCount,
        storage_efficiency_pct: storageEfficiencyPct,
        queue_binding: env.LIGHTSTORY_QUEUE ? 'bound' : 'unbound',
        queue_backlog: queueBacklog,
        workflow_binding: env.LIGHTSTORY_WORKFLOW ? 'bound' : 'unbound',
        kv_binding: env.APP_KV ? 'bound' : 'unbound',
        recorded_at: new Date().toISOString(),
      });
    }

    if (
      method === 'POST' &&
      (pathname === '/analytics/record-view' || pathname === '/analytics/views')
    ) {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body.storyId !== 'string' || !body.storyId.trim()) {
        return err('VALIDATION_ERROR', 'storyId is required', 422);
      }

      recordAnalyticsEngineEvent(env, {
        indexes: ['story_view'],
        blobs: [body.storyId, request.headers.get('User-Agent') || ''],
        doubles: [Date.now()],
      });

      const res = await sbRpc(
        'increment_story_views',
        { story_id_param: body.storyId },
        env,
        token,
      );
      return handleRes(res);
    }

    return null;
  } catch (e: any) {
    return err(
      'INTERNAL_ERROR',
      e.message || 'Unknown error',
      500,
    );
  }
}
