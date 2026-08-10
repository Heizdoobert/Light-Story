'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { SUPERADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { updateUserProfileSchema, updateUserRoleSchema } from '@/lib/schemas/user';
import { getServerSupabase } from '@/lib/supabase/server';
import type { UpdateUserProfileInput } from '@/lib/schemas/user';

import type { ActionResult } from '@/actions/result';

export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileInput,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const { userId: currentUserId } = await requireActionRole([
      'user',
      'admin',
      'superadmin',
      'super_admin',
      'employee',
      'internal',
    ]);
    const isInternal = currentUserId === 'internal';
    if (!isInternal && currentUserId !== userId) {
      return {
        success: false,
        error: 'Bạn chỉ có thể cập nhật hồ sơ của chính mình',
      };
    }
    const parsed = updateUserProfileSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.full_name !== undefined) patch.full_name = parsed.data.full_name;
    if (parsed.data.avatar_url !== undefined) patch.avatar_url = parsed.data.avatar_url;
    const targetId = isInternal ? userId : currentUserId;
    const { error } = await db.from('profiles').update(patch).eq('id', targetId);
    if (error) return { success: false, error: error.message };
    revalidateTag(CACHE_TAGS.USERS, 'max');
    return { success: true, data: { userId: targetId } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateUserRole(userId: string, role: string): Promise<ActionResult<{ userId: string; role: string }>> {
  try {
    await requireActionRole(SUPERADMIN_ROLES);
    const parsed = updateUserRoleSchema.safeParse({ userId, role });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { error } = await db
      .from('profiles')
      .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.userId);
    if (error) return { success: false, error: error.message };
    revalidateTag(CACHE_TAGS.USERS, 'max');
    return { success: true, data: { userId: parsed.data.userId, role: parsed.data.role } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}