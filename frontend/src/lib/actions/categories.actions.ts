'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { getServerSupabase } from '@/lib/supabase/server';
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
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { data: row, error } = await db
      .from('categories')
      .insert({ name: parsed.data.name, slug: parsed.data.slug })
      .select('id')
      .single();
    if (error || !row) return { success: false, error: error?.message ?? 'Tạo thể loại thất bại' };
    revalidateTag(CACHE_TAGS.GENRES, 'max');
    return { success: true, data: { id: row.id } };
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
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error } = await db.from('categories').update(parsed.data).eq('id', id);
    if (error) return { success: false, error: error.message };
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
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error } = await db.from('categories').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidateTag(CACHE_TAGS.GENRES, 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
