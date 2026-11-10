'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { fetchApi } from '@/actions/http';
import { createCategorySchema, updateCategorySchema } from '@/lib/schemas/admin';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/schemas/admin';
import type { ActionResult } from '@/actions/result';

export async function createCategory(data: CreateCategoryInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createCategorySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const res = await fetchApi('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: parsed.data.name }),
    });
    const json = (await res.json()) as { error?: string; id?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.GENRES, 'max');
    return { success: true, data: { id: json.id || '' } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateCategory(id: string, data: UpdateCategoryInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    if (!id || !id.trim()) return { success: false, error: 'ID thể loại không hợp lệ' };
    const parsed = updateCategorySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const res = await fetchApi(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(parsed.data),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.GENRES, 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    if (!id || !id.trim()) return { success: false, error: 'ID thể loại không hợp lệ' };
    const res = await fetchApi(`/api/admin/categories/${id}`, { method: 'DELETE' });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.GENRES, 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

