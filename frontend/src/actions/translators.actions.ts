'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const translatorSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

const translatorUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

const translatorDeleteSchema = z.object({
  id: z.string().min(1),
});

export async function createTranslator(input: z.infer<typeof translatorSchema>): Promise<ActionResult> {
  return act(translatorSchema, input, async ({ name, contact, notes, status }) => {
    const res = await fetchApi('/api/admin/translators', {
      method: 'POST',
      body: JSON.stringify({ name, contact, notes, status }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('translators', 'max');
    return { ok: true };
  });
}

export async function addTranslator(input: z.infer<typeof translatorSchema>): Promise<ActionResult> {
  return createTranslator(input);
}

export async function updateTranslator(input: z.infer<typeof translatorUpdateSchema>): Promise<ActionResult> {
  return act(translatorUpdateSchema, input, async ({ id, name, contact, notes, status }) => {
    const res = await fetchApi(`/api/admin/translators/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, contact, notes, status }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('translators', 'max');
    return { ok: true };
  });
}

export async function deleteTranslator(input: z.infer<typeof translatorDeleteSchema>): Promise<ActionResult> {
  return act(translatorDeleteSchema, input, async ({ id }) => {
    const res = await fetchApi(`/api/admin/translators/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('translators', 'max');
    return { ok: true };
  });
}

export async function removeTranslator(input: z.infer<typeof translatorDeleteSchema>): Promise<ActionResult> {
  return deleteTranslator(input);
}

