/** Comics endpoint handler */

import {
  Env,
  err,
  sbGet,
  sbPost,
  handleRes,
  json,
} from '../utils/supabase-client';

export async function handleComicsRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method;

  try {
    if (method === 'GET' && pathname === '/comics') {
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
      const conditions: string[] = ['status=neq.archived'];
      if (keyword)
        conditions.push(
          `or=(title.ilike.*${keyword}*,author.ilike.*${keyword}*)`,
        );
      const q = `select=id,title,author,description,cover_url,category,status,views,like_count,created_at,updated_at&order=created_at.desc&limit=${pageSize}&offset=${offset}`;
      const res = await sbGet('stories', q, env, token);
      return handleRes(res);
    }

    if (method === 'GET' && pathname.match(/^\/comics\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      const res = await sbGet(
        'stories',
        `id=eq.${id}&select=*`,
        env,
        token,
      );
      const data = await res.json();
      if (!res.ok) return handleRes(res);
      return json(
        Array.isArray(data) ? data[0] || null : data,
      );
    }

    if (method === 'POST' && pathname === '/comics') {
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

    if (
      method === 'GET' &&
      pathname.match(/^\/comics\/[^\/]+\/chapters$/)
    ) {
      const comicId = pathname.split('/')[2];
      const res = await sbGet(
        'chapters',
        `story_id=eq.${comicId}&select=id,story_id,chapter_number,title,content,view_count,created_at,updated_at&order=chapter_number.asc`,
        env,
        token,
      );
      return handleRes(res);
    }

    if (
      method === 'POST' &&
      pathname.match(/^\/comics\/[^\/]+\/chapters$/)
    ) {
      const comicId = pathname.split('/')[2];
      const body = (await request.json()) as any;
      const payload = {
        story_id: body.storyId || comicId,
        chapter_number:
          body.chapterNumber || body.chapter_number || 1,
        title: body.title,
        content: body.content || '',
      };
      const res = await sbPost('chapters', payload, env, token);
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
