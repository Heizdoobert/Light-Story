'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const updateStoryStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'archived']),
});

const featureStorySchema = z.object({
  id: z.string().min(1),
  isFeatured: z.boolean().optional(),
});

const deleteStoryAdminSchema = z.object({
  id: z.string().min(1),
});

const updateStorySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'archived']),
});

const deleteStorySchema = z.object({
  id: z.string().min(1),
});

const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'archived']),
});

const bulkDeleteStoriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function updateStoryStatus(input: z.infer<typeof updateStoryStatusSchema>): Promise<ActionResult> {
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
  return deleteStoryAdmin(input);
}

export async function bulkUpdateStatus(input: z.infer<typeof bulkUpdateStatusSchema>): Promise<ActionResult> {
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
