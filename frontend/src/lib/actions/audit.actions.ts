"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags";
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
} from "@/lib/actions/permission";

export async function logAdminActivity(
  _action: string,
  _entityType: string,
  _entityId?: string,
  _metadata?: Record<string, unknown>,
) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.AUDIT_LOGS, "max");
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
