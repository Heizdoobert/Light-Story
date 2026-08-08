'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { getServerSupabase } from '@/lib/supabase/server';
import { createComicSchema, updateComicSchema } from '@/lib/schemas/comic';
import type { CreateComicInput, UpdateComicInput } from '@/lib/schemas/comic';

type ActionResult<T = unknown> =
  | { ok: true; success: true; data?: T; error?: undefined }
  | { ok: false; success: false; error: string; data?: undefined };

export async function createComic(data: CreateComicInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createComicSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { ok: false, success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { data: row, error } = await db
      .from('stories')
      .insert({
        title: parsed.data.title,
        author: parsed.data.author,
        category: parsed.data.category,
        description: parsed.data.description,
        status: parsed.data.status,
        cover_url: parsed.data.cover_url,
      })
      .select('id')
      .single();
    if (error || !row) {
      return { ok: false, success: false, error: error?.message ?? 'Tạo truyện thất bại' };
    }
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    return { ok: true, success: true, data: { id: row.id } };
  } catch (err) {
    return { ok: false, success: false, error: (err as Error).message };
  }
}

export async function updateComic(id: string, data: UpdateComicInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = updateComicSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { ok: false, success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error } = await db
      .from('stories')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { ok: false, success: false, error: error.message };
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), 'max');
    return { ok: true, success: true, data: { id } };
  } catch (err) {
    return { ok: false, success: false, error: (err as Error).message };
  }
}

export async function deleteComic(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const db = await getServerSupabase();
    if (!db) return { ok: false, success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error } = await db.from('stories').delete().eq('id', id);
    if (error) return { ok: false, success: false, error: error.message };
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), 'max');
    return { ok: true, success: true, data: { id } };
  } catch (err) {
    return { ok: false, success: false, error: (err as Error).message };
  }
}