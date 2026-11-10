import { describe, expect, it } from 'vitest';
import { handleAdminRequest } from '../routes/admin';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_KEY: 'service',
} as unknown as Env;

function put(path: string, role: string, body: unknown): Request {
  return new Request(`https://gateway.test/api${path}`, {
    method: 'PUT',
    headers: { 'x-user-role': role, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const USER_ID = '11111111-2222-3333-4444-555555555555';

describe('admin user role update', () => {
  it('allows superadmin to change role', async () => {
    const res = await handleAdminRequest(
      put(`/admin/users/${USER_ID}`, 'superadmin', { role: 'admin' }),
      env,
      null,
      `/admin/users/${USER_ID}`,
    );
    expect(res?.status).toBe(200);
    const json = await res!.json();
    expect(json).toMatchObject({ success: true, data: { id: USER_ID, role: 'admin' } });
  });

  it('rejects employee from changing role', async () => {
    const res = await handleAdminRequest(
      put(`/admin/users/${USER_ID}`, 'employee', { role: 'admin' }),
      env,
      null,
      `/admin/users/${USER_ID}`,
    );
    expect(res?.status).toBe(403);
  });

  it('rejects admin from changing role', async () => {
    const res = await handleAdminRequest(
      put(`/admin/users/${USER_ID}`, 'admin', { role: 'admin' }),
      env,
      null,
      `/admin/users/${USER_ID}`,
    );
    expect(res?.status).toBe(403);
  });

  it('rejects invalid role even for superadmin', async () => {
    const res = await handleAdminRequest(
      put(`/admin/users/${USER_ID}`, 'superadmin', { role: 'root' }),
      env,
      null,
      `/admin/users/${USER_ID}`,
    );
    expect(res?.status).toBe(400);
  });
});
