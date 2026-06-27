/** Analytics endpoint handler */

import {
  Env,
  err,
  sbGet,
  sbRpc,
  handleRes,
  json,
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
      return json({
        r2_usage_gb: 0,
        r2_allocated_gb: 0,
        r2_object_count: 0,
        r2_egress_gb: 0,
        d1_queries_count: 0,
        d1_avg_latency_ms: 0,
        page_views: 0,
        bandwidth_gb: 0,
        cache_hit_ratio_pct: 0,
        storage_efficiency_pct: 0,
        device_mobile: 0,
        device_desktop: 0,
        device_tablet: 0,
        top_zones: [],
        recorded_at: new Date().toISOString(),
      });
    }

    if (
      method === 'POST' &&
      pathname === '/analytics/record-view'
    ) {
      const body = (await request.json()) as any;
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
