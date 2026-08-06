'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { getServerSupabase } from '@/lib/supabase/server';
import { createChapterSchema, updateChapterSchema } from '@/lib/schemas/chapter';
import type { CreateChapterInput, UpdateChapterInput } from '@/lib/schemas/chapter';

type ActionResult<T = unknown> =
  | { ok: true; success: true; data?: T; error?: undefined }
  | { ok: false; success: false; error: string; data?: undefined };

async function persistChapterImages(
  db: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>,
  chapterId: string,
  images: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!images.length) return { ok: true };
  const { error: delErr } = await db.from('chapter_images').delete().eq('chapter_id', chapterId);
  if (delErr) return { ok: false, error: delErr.message };
  const rows = images.map((image_url, index) => ({
    chapter_id: chapterId,
    image_url,
    page_number: index + 1,
  }));
  const { error } = await db.from('chapter_images').insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createChapter(data: CreateChapterInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createChapterSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { ok: false, success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { data: row, error } = await db
      .from('chapters')
      .insert({
        story_id: parsed.data.story_id,
        chapter_number: parsed.data.chapter_number,
        title: parsed.data.title,
        images: parsed.data.images,
      })
      .select('id')
      .single();
    if (error || !row) return { ok: false, success: false, error: error?.message ?? 'Tạo chương thất bại' };
    const sync = await persistChapterImages(db, row.id, parsed.data.images ?? []);
    if (!sync.ok) return { ok: false, success: false, error: sync.error ?? 'Đồng bộ ảnh thất bại' };
    revalidateTag(CACHE_TAGS.CHAPTERS(parsed.data.story_id), 'max');
    return { ok: true, success: true, data: { id: row.id } };
  } catch (err) {
    return { ok: false, success: false, error: (err as Error).message };
  }
}

export async function updateChapter(
  id: string,
  storyId: string,
  data: UpdateChapterInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = updateChapterSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { ok: false, success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const updateFields: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    delete updateFields.story_id;
    const { error } = await db.from('chapters').update(updateFields).eq('id', id);
    if (error) return { ok: false, success: false, error: error.message };
    if (parsed.data.images !== undefined) {
      const sync = await persistChapterImages(db, id, parsed.data.images ?? []);
      if (!sync.ok) return { ok: false, success: false, error: sync.error ?? 'Đồng bộ ảnh thất bại' };
    }
    revalidateTag(CACHE_TAGS.CHAPTERS(storyId), 'max');
    return { ok: true, success: true, data: { id } };
  } catch (err) {
    return { ok: false, success: false, error: (err as Error).message };
  }
}

export async function deleteChapter(id: string, storyId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const db = await getServerSupabase();
    if (!db) return { ok: false, success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error: delErr } = await db.from('chapter_images').delete().eq('chapter_id', id);
    if (delErr) return { ok: false, success: false, error: delErr.message };
    const { error } = await db.from('chapters').delete().eq('id', id);
    if (error) return { ok: false, success: false, error: error.message };
    revalidateTag(CACHE_TAGS.CHAPTERS(storyId), 'max');
    return { ok: true, success: true, data: { id } };
  } catch (err) {
    return { ok: false, success: false, error: (err as Error).message };
  }
}
