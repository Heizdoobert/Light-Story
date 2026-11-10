'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { fetchApi } from '@/actions/http';
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
    const res = await fetchApi('/api/admin/chapters', {
      method: 'POST',
      body: JSON.stringify({
        story_id: parsed.data.story_id,
        chapter_number: parsed.data.chapter_number,
        title: parsed.data.title,
        content: JSON.stringify(parsed.data.images ?? []),
      }),
    });
    const json = (await res.json()) as { error?: string; id?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.CHAPTERS(parsed.data.story_id), 'max');
    return { success: true, data: { id: json.id || '' } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateChapter(id: string, storyId: string, data: UpdateChapterInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = updateChapterSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const updateFields: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    if (updateFields.images !== undefined) {
      (updateFields as any).content = JSON.stringify((updateFields as any).images ?? []);
    }
    delete (updateFields as any).images;
    const res = await fetchApi(`/api/admin/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateFields),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.CHAPTERS(storyId), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteChapter(id: string, storyId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const res = await fetchApi(`/api/admin/chapters/${id}`, { method: 'DELETE' });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.CHAPTERS(storyId), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
