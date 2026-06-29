/** Stories endpoint handler */

import {
  Env,
  err,
  sbGet,
  sbPost,
  sb,
  handleRes,
  json,
} from '../utils/supabase-client';

export async function handleStoriesRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method;

  try {
    if (method === 'GET' && pathname === '/stories') {
      const page = Math.max(
        1,
        parseInt(url.searchParams.get('page') || '1'),
      );
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get('pageSize') || '10')),
      );
      const keyword = url.searchParams.get('keyword') || '';
      const offset = (page - 1) * pageSize;
      const allowedStatuses = ['published', 'ongoing', 'completed'];
      let q = `select=id,title,author,description,cover_url,category,status,views,like_count,created_at,updated_at&status=in.(${allowedStatuses.join(',')})&order=created_at.desc&limit=${pageSize}&offset=${offset}`;
      if (keyword) {
        q += `&or=(title.ilike.*${keyword}*,author.ilike.*${keyword}*)`;
      }
      const res = await sbGet('stories', q, env, token);
      return handleRes(res);
    }

    if (method === 'GET' && pathname.match(/^\/stories\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      const res = await sbGet('stories', `id=eq.${id}&select=*`, env, token);
      const data = await res.json();
      if (!res.ok)
        return err('SUPABASE_ERROR', await res.text(), res.status);
      return json(
        Array.isArray(data) ? data[0] || null : data,
      );
    }

    if (method === 'POST' && pathname === '/stories') {
      const body = (await request.json()) as any;
      const payload: Record<string, unknown> = {
        title: body.title,
        author: body.author,
        description: body.description || null,
        cover_url: body.cover_url || null,
        status: body.status || 'draft',
      };
      if (body.category)
        payload.category = Array.isArray(body.category)
          ? body.category.join(', ')
          : body.category;
      const res = await sbPost('stories', payload, env, token);
      return handleRes(res);
    }

    if (method === 'GET' && pathname === '/chapters') {
      const id = url.searchParams.get('id');
      const storyId = url.searchParams.get('storyId');
      if (id) {
        const res = await sbGet(
          'chapters',
          `id=eq.${id}&select=*`,
          env,
          token,
        );
        const data = await res.json();
        if (!res.ok)
          return err('SUPABASE_ERROR', await res.text(), res.status);
        return json(
          Array.isArray(data) ? data[0] || null : data,
        );
      }
      if (storyId) {
        const res = await sbGet(
          'chapters',
          `story_id=eq.${storyId}&select=*&order=chapter_number.asc`,
          env,
          token,
        );
        return handleRes(res);
      }
      return err(
        'BAD_REQUEST',
        'Missing id or storyId parameter',
        400,
      );
    }

    if (method === 'PUT' && pathname.match(/^\/chapters\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      const body = (await request.json()) as any;
      const payload: Record<string, unknown> = {};
      if (body.title !== undefined) payload.title = body.title;
      if (body.content !== undefined) payload.content = body.content;
      if (body.chapter_number !== undefined)
        payload.chapter_number = body.chapter_number;
      const res = await sb(
        `/rest/v1/chapters?id=eq.${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: { Prefer: 'return=representation' },
        },
        env,
        token,
      );
      return handleRes(res);
    }

    if (method === 'DELETE' && pathname.match(/^\/chapters\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      const res = await sb(
        `/rest/v1/chapters?id=eq.${id}`,
        { method: 'DELETE' },
        env,
        token,
      );
      return res.ok
        ? json({ success: true })
        : handleRes(res);
    }

    if (method === 'POST' && pathname === '/stories/views') {
      const body = (await request.json()) as any;
      const res = await sb(
        '/rest/v1/rpc/increment_story_views',
        {
          method: 'POST',
          body: JSON.stringify({ story_id: body.storyId }),
        },
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
