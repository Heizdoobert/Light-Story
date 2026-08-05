'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const taxonomyItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

const taxonomyUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

const taxonomyDeleteSchema = z.object({
  id: z.string().min(1),
});

const authorItemSchema = z.object({
  name: z.string().min(1),
  bio: z.string().nullable().optional(),
});

const authorUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bio: z.string().nullable().optional(),
});

// Category actions
export async function createCategory(input: z.infer<typeof taxonomyItemSchema>): Promise<ActionResult> {
  return act(taxonomyItemSchema, input, async ({ name, description }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'category', action: 'create', payload: { name, description } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function updateCategory(input: z.infer<typeof taxonomyUpdateSchema>): Promise<ActionResult> {
  return act(taxonomyUpdateSchema, input, async ({ id, name, description }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'category', action: 'update', id, payload: { name, description } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function deleteCategory(input: z.infer<typeof taxonomyDeleteSchema>): Promise<ActionResult> {
  return act(taxonomyDeleteSchema, input, async ({ id }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'category', action: 'delete', id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

// Author actions
export async function createAuthor(input: z.infer<typeof authorItemSchema>): Promise<ActionResult> {
  return act(authorItemSchema, input, async ({ name, bio }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'author', action: 'create', payload: { name, bio } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function updateAuthor(input: z.infer<typeof authorUpdateSchema>): Promise<ActionResult> {
  return act(authorUpdateSchema, input, async ({ id, name, bio }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'author', action: 'update', id, payload: { name, bio } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function deleteAuthor(input: z.infer<typeof taxonomyDeleteSchema>): Promise<ActionResult> {
  return act(taxonomyDeleteSchema, input, async ({ id }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'author', action: 'delete', id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

// Genre actions
export async function createGenre(input: z.infer<typeof taxonomyItemSchema>): Promise<ActionResult> {
  return act(taxonomyItemSchema, input, async ({ name, description }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'genre', action: 'create', payload: { name, description } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function updateGenre(input: z.infer<typeof taxonomyUpdateSchema>): Promise<ActionResult> {
  return act(taxonomyUpdateSchema, input, async ({ id, name, description }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'genre', action: 'update', id, payload: { name, description } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function deleteGenre(input: z.infer<typeof taxonomyDeleteSchema>): Promise<ActionResult> {
  return act(taxonomyDeleteSchema, input, async ({ id }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'genre', action: 'delete', id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

// Tag actions
export async function createTag(input: z.infer<typeof taxonomyItemSchema>): Promise<ActionResult> {
  return act(taxonomyItemSchema, input, async ({ name, description }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'tag', action: 'create', payload: { name, description } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function updateTag(input: z.infer<typeof taxonomyUpdateSchema>): Promise<ActionResult> {
  return act(taxonomyUpdateSchema, input, async ({ id, name, description }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'tag', action: 'update', id, payload: { name, description } }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}

export async function deleteTag(input: z.infer<typeof taxonomyDeleteSchema>): Promise<ActionResult> {
  return act(taxonomyDeleteSchema, input, async ({ id }) => {
    const res = await fetchApi('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ entity: 'tag', action: 'delete', id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('taxonomy', 'max');
    return { ok: true };
  });
}
