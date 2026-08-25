/** Analytics endpoint handler */

import {
  err,
  sbGet,
  sbRpc,
  handleRes,
  json,
  recordAnalyticsEngineEvent,
} from '../utils/supabase-client';
import { getInfrastructurePayload } from '../utils/infra';

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
      const timeRange = daysBack <= 1 ? '24h' : daysBack <= 7 ? '7d' : '30d';
      const res = await sbRpc(
        'get_user_engagement_summary',
        { p_time_range: timeRange },
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
      const payload = await getInfrastructurePayload(env);
      return json(payload);
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
