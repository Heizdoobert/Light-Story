'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { SUPERADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { getServerSupabase } from '@/lib/supabase/server';
import { auditLogSchema } from '@/lib/schemas/admin';
import type { AuditLogInput } from '@/lib/schemas/admin';

import type { ActionResult } from '@/actions/result';

export async function logAdminActivity(input: AuditLogInput): Promise<ActionResult<{ id: number }>> {
  try {
    const { userId } = await requireActionRole(SUPERADMIN_ROLES);
    const parsed = auditLogSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { data: row, error } = await db
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: parsed.data.action,
        entity_type: parsed.data.entityType,
        entity_id: parsed.data.entityId ?? null,
        metadata: parsed.data.metadata,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error || !row) return { success: false, error: error?.message ?? 'Ghi nhật ký thất bại' };
    revalidateTag(CACHE_TAGS.AUDIT_LOGS, 'max');
    return { success: true, data: { id: row.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
