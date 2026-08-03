'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { createClient } from '@/lib/api/server';

const upsertProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  full_name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
  role: z.enum(['user']).optional(),
});

const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
});

export async function upsertProfile(input: z.infer<typeof upsertProfileSchema>): Promise<ActionResult> {
  return act(upsertProfileSchema, input, async ({ id, email, full_name, avatar_url, role }) => {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').upsert(
      {
        id,
        email,
        full_name: full_name ?? email ?? 'User',
        avatar_url: avatar_url ?? null,
        role: role ?? 'user',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidateTag('profiles', 'max');
    return { ok: true };
  });
}

export async function updateProfile(input: z.infer<typeof updateProfileSchema>): Promise<ActionResult> {
  return act(updateProfileSchema, input, async ({ full_name, avatar_url }) => {
    const updates: Record<string, string | null> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (Object.keys(updates).length === 0) {
      return { ok: true };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: 'No authenticated user' };
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidateTag('profiles', 'max');
    return { ok: true };
  });
}
