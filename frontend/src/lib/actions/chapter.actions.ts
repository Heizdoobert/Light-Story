'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { getServerSupabase } from '@/lib/supabase/server';
import { createChapterSchema, updateChapterSchema } from '@/lib/schemas/chapter';
import type { CreateChapterInput, UpdateChapterInput } from '@/lib/schemas/chapter';

import type { ActionResult } from '@/actions/result';

export async function createChapter(data: CreateChapterInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createChapterSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { data: row, error } = await db
      .from('chapters')
      .insert({
        story_id: parsed.data.story_id,
        chapter_number: parsed.data.chapter_number,
        title: parsed.data.title,
        content: JSON.stringify(parsed.data.images ?? []),
      })
      .select('id')
      .single();
    if (error || !row) return { success: false, error: error?.message ?? 'Tạo chương thất bại' };
    revalidateTag(CACHE_TAGS.CHAPTERS(parsed.data.story_id), 'max');
    return { success: true, data: { id: row.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
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
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const updateFields: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    delete updateFields.story_id;
    if (updateFields.images !== undefined) {
      updateFields.content = JSON.stringify(updateFields.images ?? []);
    }
    delete updateFields.images;
    const { error } = await db.from('chapters').update(updateFields).eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidateTag(CACHE_TAGS.CHAPTERS(storyId), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteChapter(id: string, storyId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error } = await db.from('chapters').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidateTag(CACHE_TAGS.CHAPTERS(storyId), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
