/** Comics endpoint handler */

import {
  Env,
  err,
  sbGet,
  sbPost,
  handleRes,
  json,
} from '../utils/supabase-client';
import {
  validateBody,
  sanitizeBody,
  getAuthRole,
  requireRole,
  VALID_STATUSES,
} from '../utils/validation';

export async function handleComicsRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method;

  try {
    if (method === 'GET' && pathname === '/comics/recommendations') {
      return handleComicRecommendations(url, env, token);
    }

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
      const role = getAuthRole(request);
      if (!requireRole(role, ['superadmin', 'admin', 'employee'])) {
        return err('FORBIDDEN', 'Staff role required', 403);
      }

      const body = (await request.json()) as Record<string, unknown>;
      const errors = validateBody(body, [
        { field: 'title', type: 'required-string', maxLength: 200 },
        { field: 'author', type: 'optional-string', maxLength: 100 },
        { field: 'description', type: 'optional-string', maxLength: 2000 },
        { field: 'cover_url', type: 'optional-string', maxLength: 1000 },
        { field: 'status', type: 'enum', enumValues: VALID_STATUSES },
        { field: 'category', type: 'optional-array' },
      ]);
      if (errors.length > 0) {
        return err('VALIDATION_ERROR', errors.map(e => `${e.field}: ${e.message}`).join('; '), 400);
      }

      const s = sanitizeBody(body, [
        { field: 'title', type: 'required-string', maxLength: 200 },
        { field: 'author', type: 'optional-string', maxLength: 100 },
        { field: 'description', type: 'optional-string', maxLength: 2000 },
        { field: 'cover_url', type: 'optional-string', maxLength: 1000 },
        { field: 'status', type: 'enum', enumValues: VALID_STATUSES },
      ]);

      const payload: Record<string, unknown> = {
        title: s.title,
        author: (s.author as string) || '',
        description: (s.description as string) || null,
        cover_url: (s.cover_url as string) || null,
        status: s.status || 'draft',
      };
      if (body.category)
        payload.category = Array.isArray(body.category)
          ? (body.category as string[]).join(', ')
          : String(body.category);
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

export async function handleComicRecommendations(
  url: URL,
  env: Env,
  token: string | null,
): Promise<Response> {
  const comicId = url.searchParams.get('comicId');
  const limitStr = url.searchParams.get('limit') || '6';
  const limit = parseInt(limitStr, 10) || 6;

  if (!comicId) {
    return err('INVALID_INPUT', 'comicId parameter is required', 400);
  }

  const targetRes = await sbGet('stories', `id=eq.${comicId}&select=*`, env, token);
  if (!targetRes.ok) {
    return json({ success: true, data: [] });
  }
  const targetData = (await targetRes.json()) as any[];
  const targetComic = Array.isArray(targetData) && targetData.length > 0 ? targetData[0] : null;

  if (!targetComic) {
    return json({ success: true, data: [] });
  }

  const candidatesRes = await sbGet('stories', `id=neq.${comicId}&status=neq.archived&select=*&limit=50`, env, token);
  const candidatesData = candidatesRes.ok ? ((await candidatesRes.json()) as any[]) : [];
  const candidates = Array.isArray(candidatesData) ? candidatesData : [];

  const targetCategories: string[] = Array.isArray(targetComic.category)
    ? targetComic.category
    : typeof targetComic.category === 'string'
    ? (() => { try { return JSON.parse(targetComic.category); } catch { return []; } })()
    : [];

  const scored = candidates.map((c) => {
    const cCategories: string[] = Array.isArray(c.category)
      ? c.category
      : typeof c.category === 'string'
      ? (() => { try { return JSON.parse(c.category); } catch { return []; } })()
      : [];

    const overlap = cCategories.filter((cat) => targetCategories.includes(cat)).length;
    const authorBonus = c.author && targetComic.author && c.author === targetComic.author ? 0.5 : 0;
    return { ...c, _score: overlap + authorBonus };
  });

  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    const viewsA = a.views || a.view_count || 0;
    const viewsB = b.views || b.view_count || 0;
    return viewsB - viewsA;
  });

  const recommendations = scored.slice(0, limit).map(({ _score, ...rest }) => rest);
  return json({ success: true, data: recommendations });
}
