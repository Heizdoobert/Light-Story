'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { SUPERADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { updateUserProfileSchema, updateUserRoleSchema } from '@/lib/schemas/user';
import { fetchApi } from '@/actions/http';
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
    const targetId = isInternal ? userId : currentUserId;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.full_name !== undefined) patch.full_name = parsed.data.full_name;
    if (parsed.data.avatar_url !== undefined) patch.avatar_url = parsed.data.avatar_url;
    const res = await fetchApi(`/api/admin/users/${targetId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
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
    const res = await fetchApi(`/api/admin/users/${parsed.data.userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role: parsed.data.role, updated_at: new Date().toISOString() }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    // No direct DB access needed; fetchApi handles auth and request

    revalidateTag(CACHE_TAGS.USERS, 'max');
    return { success: true, data: { userId: parsed.data.userId, role: parsed.data.role } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}