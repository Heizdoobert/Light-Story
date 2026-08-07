'use server';

import type { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import {
  updateStoryStatusSchema,
  featureStorySchema,
  deleteStoryAdminSchema,
  updateStorySchema,
  deleteStorySchema,
  bulkUpdateStatusSchema,
  bulkDeleteStoriesSchema,
} from '@/lib/schemas/admin-stories';

export async function updateStoryStatus(input: unknown): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(updateStoryStatusSchema, input, async ({ id, status }) => {
    const res = await fetchApi('/api/admin/manage-story', {
      method: 'POST',
      body: JSON.stringify({ action: 'updateStatus', id, status }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}

export async function featureStory(input: z.infer<typeof featureStorySchema>): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(featureStorySchema, input, async ({ id, isFeatured = true }) => {
    const res = await fetchApi('/api/admin/manage-story', {
      method: 'POST',
      body: JSON.stringify({ action: 'feature', id, isFeatured }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}

export async function deleteStoryAdmin(input: z.infer<typeof deleteStoryAdminSchema>): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(deleteStoryAdminSchema, input, async ({ id }) => {
    const res = await fetchApi('/api/admin/manage-story', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}

export async function updateStory(input: z.infer<typeof updateStorySchema>): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(updateStorySchema, input, async ({ id, title, description, status }) => {
    const res = await fetchApi('/api/admin/manage-story', {
      method: 'POST',
      body: JSON.stringify({ action: 'update', id, payload: { title, description, status } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}

export async function deleteStory(input: z.infer<typeof deleteStorySchema>): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(deleteStorySchema, input, async ({ id }) => {
    const res = await fetchApi('/api/admin/manage-story', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}

export async function bulkUpdateStatus(input: z.infer<typeof bulkUpdateStatusSchema>): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(bulkUpdateStatusSchema, input, async ({ ids, status }) => {
    const res = await fetchApi('/api/admin/manage-story', {
      method: 'POST',
      body: JSON.stringify({ action: 'bulkUpdateStatus', ids, status }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}

export async function bulkDeleteStories(input: z.infer<typeof bulkDeleteStoriesSchema>): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(bulkDeleteStoriesSchema, input, async ({ ids }) => {
    const res = await fetchApi('/api/admin/manage-story', {
      method: 'POST',
      body: JSON.stringify({ action: 'bulkDelete', ids }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}
