'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { getServerSupabase } from '@/lib/supabase/server';
import { createComicSchema, updateComicSchema } from '@/lib/schemas/comic';
import type { CreateComicInput, UpdateComicInput } from '@/lib/schemas/comic';

import type { ActionResult } from '@/actions/result';

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

async function uniqueSlug(db: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>, base: string, excludeId?: string): Promise<string> {
  let candidate = base || 'comic';
  for (let i = 2; ; i++) {
    let query = db.from('stories').select('id').eq('slug', candidate);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.limit(1);
    if (!data || data.length === 0) return candidate;
    candidate = `${base}-${i}`;
  }
}

export async function createComic(data: CreateComicInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createComicSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const slug = await uniqueSlug(db, (parsed.data.slug || slugify(parsed.data.title)).trim());
    const { data: row, error } = await db
      .from('stories')
      .insert({
        title: parsed.data.title,
        author: parsed.data.author,
        translator: parsed.data.translator,
        category: parsed.data.category,
        description: parsed.data.description,
        status: parsed.data.status,
        cover_url: parsed.data.cover_url,
        slug,
      })
      .select('id')
      .single();
    if (error || !row) {
      return { success: false, error: error?.message ?? 'Tạo truyện thất bại' };
    }
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    return { success: true, data: { id: row.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateComic(id: string, data: UpdateComicInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = updateComicSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const updateFields: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    if (typeof updateFields.slug === 'string' && updateFields.slug.trim()) {
      updateFields.slug = await uniqueSlug(db, slugify(updateFields.slug), id);
    } else {
      delete updateFields.slug;
    }
    const { error } = await db
      .from('stories')
      .update(updateFields)
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteComic(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error } = await db.from('stories').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}