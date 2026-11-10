'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { fetchApi } from '@/actions/http';
import { createComicSchema, updateComicSchema } from '@/lib/schemas/comic';
import type { CreateComicInput, UpdateComicInput } from '@/lib/schemas/comic';
import type { ActionResult } from '@/actions/result';

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const res = await fetchApi('/api/admin/comics');
  const json = (await res.json()) as { data?: Array<{ id: string; slug: string }> };
  const existing: Array<{ id: string; slug: string }> = json.data ?? [];
  let candidate = base || 'comic';
  for (let i = 2; ; i++) {
    const conflict = existing.find((c) => c.slug === candidate && c.id !== excludeId);
    if (!conflict) return candidate;
    candidate = `${base}-${i}`;
  }
}

export async function createComic(data: CreateComicInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createComicSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const slug = await uniqueSlug((parsed.data.slug || slugify(parsed.data.title)).trim());
    const res = await fetchApi('/api/admin/comics', {
      method: 'POST',
      body: JSON.stringify({ ...parsed.data, slug }),
    });
    const json = (await res.json()) as { error?: string; id?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    return { success: true, data: { id: json.id || '' } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateComic(id: string, data: UpdateComicInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = updateComicSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const title = parsed.data.title ?? '';
    const slug = await uniqueSlug((parsed.data.slug || slugify(title)).trim(), id);
    const res = await fetchApi(`/api/admin/comics/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...parsed.data, slug }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteComic(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return { success: false, error: 'ID truyện không hợp lệ' };
    }
    const res = await fetchApi(`/api/admin/comics/${id}`, { method: 'DELETE' });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.COMICS, 'max');
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), 'max');
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
