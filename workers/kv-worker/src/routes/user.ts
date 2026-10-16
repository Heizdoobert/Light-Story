import { err, sbGet, sbPost, sb, handleRes, json } from '../utils/supabase-client';
import { assertUuid, uuidFilter, ValidationFailure } from '../utils/validation';

export async function handleUserRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const method = request.method;
  const rawUserId = request.headers.get('x-user-id');

  if (!rawUserId) {
    if (method === 'GET' && (pathname === '/user/history' || pathname === '/user/bookmarks')) {
      return json([]);
    }
    return err('UNAUTHORIZED', 'User ID required', 401);
  }

  // The gateway strips any client-supplied x-user-id and sets this from the
  // verified JWT (index.ts). Validate anyway: this module is also reachable in
  // tests and would otherwise interpolate the header straight into a query.
  let userId: string;
  try {
    userId = assertUuid(rawUserId, 'userId');
  } catch (e) {
    if (e instanceof ValidationFailure) return err('VALIDATION_ERROR', e.message, 400);
    throw e;
  }

  try {
    if (method === 'GET' && pathname === '/user/bookmarks') {
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(new URL(request.url).searchParams.get('pageSize') || '50')),
      );
      const res = await sbGet(
        'bookmarks',
        `${uuidFilter('user_id', userId)}&select=comic_id,created_at&order=created_at.desc&limit=${pageSize}`,
        env,
        token,
      );
      return handleRes(res);
    }

    if (method === 'POST' && pathname === '/user/bookmarks/add') {
      const body = (await request.json()) as { comicId?: string };
      if (typeof body.comicId !== 'string' || !body.comicId.trim()) return err('VALIDATION_ERROR', 'comicId required', 422);

      const existing = await (
        await fetch(`${env.SUPABASE_URL}/rest/v1/bookmarks?${uuidFilter('user_id', userId)}&${uuidFilter('comic_id', body.comicId)}&select=id`, {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`,
          },
        })
      ).json();

      if (!Array.isArray(existing) || existing.length === 0) {
        await sbPost('bookmarks', { user_id: userId, comic_id: body.comicId }, env, token);
      }
      return json({ bookmarked: true });
    }

    if (method === 'POST' && pathname.match(/^\/user\/bookmarks\/[^\/]+$/)) {
      const comicId = pathname.split('/')[3];
      const existing = await (
        await fetch(`${env.SUPABASE_URL}/rest/v1/bookmarks?${uuidFilter('user_id', userId)}&${uuidFilter('comic_id', comicId)}&select=id`, {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`,
          },
        })
      ).json();

      if (!Array.isArray(existing) || existing.length === 0) {
        await sbPost('bookmarks', { user_id: userId, comic_id: comicId }, env, token);
      }
      return json({ bookmarked: true });
    }

    if (method === 'DELETE' && pathname.match(/^\/user\/bookmarks\/[^\/]+$/)) {
      const comicId = pathname.split('/')[3];
      const existing = await (
        await fetch(`${env.SUPABASE_URL}/rest/v1/bookmarks?${uuidFilter('user_id', userId)}&${uuidFilter('comic_id', comicId)}&select=id`, {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`,
          },
        })
      ).json();

      if (Array.isArray(existing) && existing.length > 0) {
        await sb(
          `/rest/v1/bookmarks?${uuidFilter('id', (existing[0] as any).id)}`,
          { method: 'DELETE' },
          env,
          token,
        );
      }
      return json({ bookmarked: false });
    }

    if (method === 'POST' && pathname === '/user/bookmarks/remove') {
      const body = (await request.json()) as { comicId?: string };
      if (typeof body.comicId !== 'string' || !body.comicId.trim()) return err('VALIDATION_ERROR', 'comicId required', 422);

      const existing = await (
        await fetch(`${env.SUPABASE_URL}/rest/v1/bookmarks?${uuidFilter('user_id', userId)}&${uuidFilter('comic_id', body.comicId)}&select=id`, {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`,
          },
        })
      ).json();

      if (Array.isArray(existing) && existing.length > 0) {
        await sb(
          `/rest/v1/bookmarks?${uuidFilter('id', (existing[0] as any).id)}`,
          { method: 'DELETE' },
          env,
          token,
        );
      }
      return json({ bookmarked: false });
    }

    if (method === 'POST' && pathname === '/user/bookmarks/toggle') {
      const body = (await request.json()) as { comicId?: string };
      if (typeof body.comicId !== 'string' || !body.comicId.trim()) return err('VALIDATION_ERROR', 'comicId required', 422);

      const existing = await (
        await fetch(`${env.SUPABASE_URL}/rest/v1/bookmarks?${uuidFilter('user_id', userId)}&${uuidFilter('comic_id', body.comicId)}&select=id`, {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`,
          },
        })
      ).json();

      if (Array.isArray(existing) && existing.length > 0) {
        await sb(
          `/rest/v1/bookmarks?${uuidFilter('id', (existing[0] as any).id)}`,
          { method: 'DELETE' },
          env,
          token,
        );
        return json({ bookmarked: false });
      }

      await sbPost('bookmarks', { user_id: userId, comic_id: body.comicId }, env, token);
      return json({ bookmarked: true });
    }

    if (method === 'GET' && pathname === '/user/history') {
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(new URL(request.url).searchParams.get('pageSize') || '50')),
      );
      const res = await sbGet(
        'reading_history',
        `${uuidFilter('user_id', userId)}&select=comic_id,chapter_id,chapter_number,updated_at&order=updated_at.desc&limit=${pageSize}`,
        env,
        token,
      );
      return handleRes(res);
    }

    if (method === 'POST' && pathname === '/user/history') {
      const body = (await request.json()) as { comicId?: string; chapterId?: string; chapterNumber?: number };
      if (typeof body.comicId !== 'string' || !body.comicId.trim()) return err('VALIDATION_ERROR', 'comicId required', 422);

      const payload: Record<string, unknown> = {
        user_id: userId,
        comic_id: body.comicId,
        chapter_id: body.chapterId || '',
        chapter_number: body.chapterNumber || 1,
        updated_at: new Date().toISOString(),
      };

      const res = await sb(
        `/rest/v1/reading_history?on_conflict=user_id,comic_id`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        },
        env,
        token,
      );
      return handleRes(res);
    }

    return null;
  } catch (e: unknown) {
    if (e instanceof ValidationFailure) {
      return err('VALIDATION_ERROR', e.message, 400);
    }
    console.error('[user] unhandled error', {
      path: pathname,
      method,
      message: e instanceof Error ? e.message : String(e),
    });
    return err('INTERNAL_ERROR', 'Request failed', 500);
  }
}
