import { Env, err, sbGet, sbPost, sb, handleRes, json } from '../utils/supabase-client';

export async function handleUserRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method;
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return err('UNAUTHORIZED', 'User ID required', 401);
  }

  try {
    if (method === 'GET' && pathname === '/user/bookmarks') {
      const res = await sbGet(
        'bookmarks',
        `user_id=eq.${userId}&select=comic_id,created_at&order=created_at.desc`,
        env,
        token,
      );
      return handleRes(res);
    }

    if (method === 'POST' && pathname === '/user/bookmarks/toggle') {
      const body = (await request.json()) as { comicId?: string };
      if (!body.comicId) return err('BAD_REQUEST', 'comicId required', 400);

      const existing = await (
        await fetch(`${env.SUPABASE_URL}/rest/v1/bookmarks?user_id=eq.${userId}&comic_id=eq.${body.comicId}&select=id`, {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`,
          },
        })
      ).json();

      if (Array.isArray(existing) && existing.length > 0) {
        await sb(
          `/rest/v1/bookmarks?id=eq.${(existing[0] as any).id}`,
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
      const res = await sbGet(
        'reading_history',
        `user_id=eq.${userId}&select=comic_id,chapter_id,chapter_number,updated_at&order=updated_at.desc&limit=50`,
        env,
        token,
      );
      return handleRes(res);
    }

    if (method === 'POST' && pathname === '/user/history') {
      const body = (await request.json()) as { comicId?: string; chapterId?: string; chapterNumber?: number };
      if (!body.comicId) return err('BAD_REQUEST', 'comicId required', 400);

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
  } catch (e: any) {
    return err('INTERNAL_ERROR', e.message || 'Unknown error', 500);
  }
}
