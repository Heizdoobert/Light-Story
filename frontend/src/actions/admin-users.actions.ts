'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { createClient } from '@/lib/api/server';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';

const updateProfileRoleSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
});

export async function updateProfileRole(input: { id: string; role: string }): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { ok: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }

  return act(updateProfileRoleSchema, input, async ({ id, role }) => {
    const res = await fetchApi('/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({ action: 'updateRole', id, role }),
    }).catch(() => null);

    if (res && res.ok) {
      revalidateTag('profiles', 'max');
      return { ok: true };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidateTag('profiles', 'max');
    return { ok: true };
  });
}

export async function updateUserRole(input: { id: string; role: string }): Promise<ActionResult> {
  return updateProfileRole(input);
}

const updateProfileNameSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().nullable(),
});

export async function updateProfileName(input: {
  id: string;
  full_name: string | null;
}): Promise<ActionResult> {
  return act(updateProfileNameSchema, input, async ({ id, full_name }) => {
    const res = await fetchApi('/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({ action: 'updateName', id, full_name }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('profiles', 'max');
    return { ok: true };
  });
}

export async function updateUserName(input: {
  id: string;
  full_name: string | null;
}): Promise<ActionResult> {
  return updateProfileName(input);
}

const updateUserStatusSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
});

export async function updateUserStatus(input: { id: string; status: string }): Promise<ActionResult> {
  return act(updateUserStatusSchema, input, async ({ id, status }) => {
    const res = await fetchApi('/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({ action: 'updateStatus', id, status }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('profiles', 'max');
    return { ok: true };
  });
}

const manageAdminUserSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('delete'), id: z.string().min(1), targetEmail: z.string().optional() }),
  z.object({
    action: z.literal('create'),
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().nullable().optional(),
    role: z.string().min(1).optional(),
  }),
]);

export async function manageAdminUser(input: z.infer<typeof manageAdminUserSchema>): Promise<ActionResult> {
  return act(manageAdminUserSchema, input, async (payload) => {
    const res = await fetchApi('/api/admin/manage-user', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      revalidateTag('profiles', 'max');
      return { ok: true };
    }

    const error = await messageFromResponse(res);

    // ponytail: mirrors the old admin client fallback; token now sourced from the server cookie session
    const shouldFallbackToEdgeFunction =
      res.status >= 500 &&
      /server supabase unavailable|createUser failed|createUser exception|Internal error|Cannot read properties of undefined/i.test(error);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (shouldFallbackToEdgeFunction && supabaseUrl && supabaseKey) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) {
        const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/manage-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const edgeJson = (await edgeResponse.json().catch(() => ({ raw: '' }))) as {
          raw?: string;
          error?: string;
        };
        if (edgeResponse.ok) {
          revalidateTag('profiles', 'max');
          return { ok: true, data: edgeJson };
        }
        return { ok: false, error: edgeJson?.error ?? `Request failed ${edgeResponse.status}` };
      }
    }

    return { ok: false, error };
  });
}

export async function deleteUser(input: { id: string; email?: string }): Promise<ActionResult> {
  return manageAdminUser({ action: 'delete', id: input.id, targetEmail: input.email || '' });
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName?: string | null;
  role?: string;
}): Promise<ActionResult> {
  return manageAdminUser({ action: 'create', ...input });
}
