/** Stories endpoint handler */

import {
  err,
  sbGet,
  sbPost,
  sb,
  sbGetCount,
  handleRes,
  json,
} from '../utils/supabase-client';
import { validateBody, sanitizeBody, VALID_STATUSES, isValidUuid } from '../utils/validation';
import { withCache, buildCacheKey, invalidateCache } from '../middleware/cache';

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

async function uniqueSlug(env: Env, token: string | null, base: string): Promise<string> {
  let candidate = base || 'story';
  for (let i = 2; ; i++) {
    const res = await sbGet('stories', `select=id&slug=eq.${encodeURIComponent(candidate)}`, env, token);
    if (!res.ok) return candidate;
    const rows = (await res.json()) as Array<{ id: string }>;
    if (rows.length === 0) return candidate;
    candidate = `${base}-${i}`;
  }
}

export async function handleStoriesRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method;

  try {
    if (method === 'GET' && pathname === '/categories') {
      return withCache(env.APP_KV, 'categories', { ttlSec: 600 }, async () => {
        const res = await sbGet(
          'categories',
          'select=id,name&order=name.asc',
          env,
          token,
        );
        return handleRes(res);
      });
    }

    if (method === 'GET' && pathname === '/stories') {
      const page = Math.max(
        1,
        parseInt(url.searchParams.get('page') || '1'),
      );
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get('pageSize') || '10')),
      );
      const keyword = (url.searchParams.get('keyword') || '').replace(/[\(\),&]/g, '').trim();
      const category = (url.searchParams.get('category') || '').replace(/[\(\),&]/g, '').trim();
      const tag = (url.searchParams.get('tag') || '').replace(/[\(\),&]/g, '').trim();
      const sort = url.searchParams.get('sort') || 'newest';

      const cacheKey = buildCacheKey('stories:list', { keyword, category, tag, sort, page, pageSize });
      const data = await withCache(env.APP_KV, cacheKey, { ttlSec: 60 }, async () => {
        const offset = (page - 1) * pageSize;
        const allowedStatuses = ['published', 'ongoing', 'completed'];

        const sortMap: Record<string, string> = {
          newest: 'created_at.desc',
          popular: 'views.desc',
          alphabet: 'title.asc',
          newest_update: 'updated_at.desc',
        };
        const order = sortMap[sort] || 'created_at.desc';

        let q = `select=id,title,author,description,cover_url,category,tags,status,views,like_count,created_at,updated_at&status=in.(${allowedStatuses.join(',')})&order=${order}&limit=${pageSize}&offset=${offset}`;
        if (keyword) {
          q += `&or=(title.ilike.*${encodeURIComponent(keyword)}*,author.ilike.*${encodeURIComponent(keyword)}*)`;
        }
        if (category) {
          q += `&category=ilike.*${encodeURIComponent(category)}*`;
        }
        if (tag) {
          q += `&tags=ilike.*${encodeURIComponent(tag)}*`;
        }
        const res = await sbGet('stories', q, env, token);
        if (!res.ok) return handleRes(res);
        const items = await res.json();

        let countQ = `stories?status=in.(${allowedStatuses.join(',')})`;
        if (keyword) {
          countQ += `&or=(title.ilike.*${encodeURIComponent(keyword)}*,author.ilike.*${encodeURIComponent(keyword)}*)`;
        }
        if (category) {
          countQ += `&category=ilike.*${encodeURIComponent(category)}*`;
        }
        if (tag) {
          countQ += `&tags=ilike.*${encodeURIComponent(tag)}*`;
        }
        const total = await sbGetCount(countQ, env, token);
        return { items, total };
      });
      return json(data);
    }

    if (method === 'GET' && pathname.match(/^\/stories\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      if (!isValidUuid(id))
        return err('VALIDATION_ERROR', 'Invalid story id', 400);
      const data = await withCache(env.APP_KV, `story:${id}`, { ttlSec: 300 }, async () => {
        const res = await sbGet('stories', `id=eq.${id}&select=*`, env, token);
        const data = await res.json();
        if (!res.ok)
          return err('SUPABASE_ERROR', JSON.stringify(data), res.status);
        return Array.isArray(data) ? data[0] || null : data;
      });
      return json(data);
    }

    if (method === 'POST' && pathname === '/stories') {
      const body = (await request.json()) as Record<string, unknown>;
      const rules = [
        { field: 'title', type: 'required-string', maxLength: 200 },
        { field: 'author', type: 'required-string', maxLength: 120 },
        { field: 'description', type: 'optional-string', maxLength: 5000 },
        { field: 'cover_url', type: 'optional-string', maxLength: 2000 },
        { field: 'category', type: 'optional-string', maxLength: 200 },
        { field: 'status', type: 'enum', enumValues: VALID_STATUSES },
      ] as const;
      const errors = validateBody(body, rules as any);
      if (errors.length > 0) {
        return err(
          'VALIDATION_ERROR',
          errors.map((e) => e.message).join('; '),
          422,
        );
      }
      const payload = sanitizeBody(body, rules as any) as Record<string, unknown>;
      if (Array.isArray(body.category)) {
        payload.category = (body.category as string[]).join(', ');
      }
      if (payload.cover_url === '') payload.cover_url = null;
      if (payload.description === '') payload.description = null;
      if (!payload.status) payload.status = 'draft';
      payload.slug = await uniqueSlug(env, token, slugify(String(payload.title)));
      const res = await sbPost('stories', payload, env, token);
      if (res.ok) await invalidateCache(env.APP_KV, ['cache:stories:list:*', 'cache:categories']);
      return handleRes(res);
    }

    if (method === 'GET' && pathname === '/chapters') {
      const id = url.searchParams.get('id');
      const storyId = url.searchParams.get('storyId');
      if (id) {
        if (!isValidUuid(id))
          return err('VALIDATION_ERROR', 'Invalid chapter id', 400);
        const res = await sbGet(
          'chapters',
          `id=eq.${id}&select=*`,
          env,
          token,
        );
        const data = await res.json();
        if (!res.ok)
          return err('SUPABASE_ERROR', JSON.stringify(data), res.status);
        return json(
          Array.isArray(data) ? data[0] || null : data,
        );
      }
      if (storyId) {
        if (!isValidUuid(storyId))
          return err('VALIDATION_ERROR', 'Invalid storyId', 400);
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

    if (method === 'GET' && pathname.match(/^\/chapters\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      if (!isValidUuid(id))
        return err('VALIDATION_ERROR', 'Invalid chapter id', 400);
      const res = await sbGet(
        'chapters',
        `id=eq.${id}&select=*`,
        env,
        token,
      );
      const data = await res.json();
      if (!res.ok)
        return err('SUPABASE_ERROR', JSON.stringify(data), res.status);
      return json(
        Array.isArray(data) ? data[0] || null : data,
      );
    }

    if (method === 'PUT' && pathname.match(/^\/chapters\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      if (!isValidUuid(id))
        return err('VALIDATION_ERROR', 'Invalid chapter id', 400);
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
      if (res.ok && body.storyId) {
        await invalidateCache(env.APP_KV, [`cache:chapters:${body.storyId}`]);
      }
      return handleRes(res);
    }

    if (method === 'DELETE' && pathname.match(/^\/chapters\/[^\/]+$/)) {
      const id = pathname.split('/')[2];
      if (!isValidUuid(id))
        return err('VALIDATION_ERROR', 'Invalid chapter id', 400);
      // Look up story_id before delete for cache invalidation
      let storyId: string | null = null;
      try {
        const lookup = await sbGet('chapters', `id=eq.${id}&select=story_id`, env, token);
        if (lookup.ok) {
          const rows = await lookup.json() as Array<{ story_id: string }>;
          if (rows.length > 0) storyId = rows[0].story_id;
        }
      } catch { /* ignore */ }
      const res = await sb(
        `/rest/v1/chapters?id=eq.${id}`,
        { method: 'DELETE' },
        env,
        token,
      );
      if (res.ok && storyId) {
        await invalidateCache(env.APP_KV, [`cache:chapters:${storyId}`]);
      }
      return res.ok
        ? json({ success: true })
        : handleRes(res);
    }

    if (method === 'POST' && pathname === '/stories/views') {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body.storyId !== 'string' || !body.storyId.trim()) {
        return err('VALIDATION_ERROR', 'storyId is required', 422);
      }
      const res = await sb(
        '/rest/v1/rpc/increment_story_views',
        {
          method: 'POST',
          body: JSON.stringify({ story_id_param: body.storyId }),
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
