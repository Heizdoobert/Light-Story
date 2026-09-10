import { describe, expect, it } from 'vitest';
import { handleAdminRequest } from '../routes/admin';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_KEY: 'service',
} as unknown as Env;

function post(path: string, role: string, body: unknown): Request {
  return new Request(`https://gateway.test/api${path}`, {
    method: 'POST',
    headers: { 'x-user-role': role, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function del(path: string, role: string): Request {
  return new Request(`https://gateway.test/api${path}`, {
    method: 'DELETE',
    headers: { 'x-user-role': role },
  });
}

const ID = '11111111-2222-3333-4444-555555555555';

describe('role mutation authorization', () => {
  it('rejects employee changing a role', async () => {
    const res = await handleAdminRequest(
      post('/admin/profiles', 'employee', { action: 'updateRole', id: ID, role: 'superadmin' }),
      env,
      null,
      '/admin/profiles',
    );
    expect(res?.status).toBe(403);
  });

  it('rejects admin changing a role', async () => {
    const res = await handleAdminRequest(
      post('/admin/profiles', 'admin', { action: 'updateRole', id: ID, role: 'superadmin' }),
      env,
      null,
      '/admin/profiles',
    );
    expect(res?.status).toBe(403);
  });

  it('rejects an unknown role value even from superadmin', async () => {
    const res = await handleAdminRequest(
      post('/admin/profiles', 'superadmin', { action: 'updateRole', id: ID, role: 'root' }),
      env,
      null,
      '/admin/profiles',
    );
    expect(res?.status).toBe(400);
  });

  it('rejects employee creating a user', async () => {
    const res = await handleAdminRequest(
      post('/admin/users', 'employee', { action: 'create', email: 'a@b.c', password: 'x', role: 'superadmin' }),
      env,
      null,
      '/admin/users',
    );
    expect(res?.status).toBe(403);
  });

  it('rejects employee deleting a user', async () => {
    const res = await handleAdminRequest(
      post('/admin/users', 'employee', { action: 'delete', id: ID }),
      env,
      null,
      '/admin/users',
    );
    expect(res?.status).toBe(403);
  });

  it('rejects employee deleting a profile', async () => {
    const res = await handleAdminRequest(
      del(`/admin/profiles/${ID}`, 'employee'),
      env,
      null,
      `/admin/profiles/${ID}`,
    );
    expect(res?.status).toBe(403);
  });
});
