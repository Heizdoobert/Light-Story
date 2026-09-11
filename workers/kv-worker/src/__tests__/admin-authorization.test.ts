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

describe('id validation', () => {
  it('rejects a PostgREST operator in the comic delete path', async () => {
    const evil = 'neq.00000000-0000-0000-0000-000000000000';
    const res = await handleAdminRequest(
      del(`/admin/comics/${evil}`, 'admin'),
      env,
      null,
      `/admin/comics/${evil}`,
    );
    expect(res?.status).toBe(400);
    expect(await res!.json()).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('rejects a non-uuid in the comic patch path', async () => {
    const res = await handleAdminRequest(
      new Request('https://gateway.test/api/admin/comics/abc', {
        method: 'PATCH',
        headers: { 'x-user-role': 'admin', 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      }),
      env,
      null,
      '/admin/comics/abc',
    );
    expect(res?.status).toBe(400);
  });

  it('rejects a bad id inside a bulkDelete list', async () => {
    const res = await handleAdminRequest(
      post('/admin/stories', 'admin', { action: 'bulkDelete', ids: [ID, 'or=(1.eq.1)'] }),
      env,
      null,
      '/admin/stories',
    );
    expect(res?.status).toBe(400);
  });

  it('rejects a non-uuid chapter id on delete', async () => {
    const path = `/admin/comics/${ID}/chapters/not-a-uuid`;
    const res = await handleAdminRequest(del(path, 'admin'), env, null, path);
    expect(res?.status).toBe(400);
  });
});

// Sites the plan's Task 4 enumeration missed; found by the Final Verification
// grep and guarded in the same task (see ledger Ruling 4).
describe('id validation — sites beyond the plan enumeration', () => {
  it('rejects a bad taxonomy id on delete', async () => {
    const res = await handleAdminRequest(
      post('/admin/taxonomy', 'admin', {
        entity: 'genre',
        action: 'delete',
        id: 'neq.00000000-0000-0000-0000-000000000000',
      }),
      env,
      null,
      '/admin/taxonomy',
    );
    expect(res?.status).toBe(400);
    // Must fail on the id guard, not on the unknown-entity branch, which also
    // returns 400 -- 'genre' is a real entity key.
    expect(await res!.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('rejects an operator smuggled into the site-settings keys filter', async () => {
    const res = await handleAdminRequest(
      new Request('https://gateway.test/api/admin/site-settings?keys=ad_enabled,x)or(1.eq.1', {
        headers: { 'x-user-role': 'superadmin' },
      }),
      env,
      null,
      '/admin/site-settings',
    );
    expect(res?.status).toBe(400);
  });
});

describe('removed endpoints', () => {
  it('no longer mints unverified R2 signed URLs', async () => {
    const res = await handleAdminRequest(
      post('/admin/r2/signed-url', 'superadmin', { key: 'covers/x.png' }),
      env,
      null,
      '/admin/r2/signed-url',
    );
    // Unhandled admin paths fall through to null; index.ts turns that into 404.
    expect(res).toBeNull();
  });
});

describe('R2 route authorization', () => {
  const r2Env = { ...env, R2_BUCKET: {} } as unknown as Env;

  it('rejects employee listing the bucket', async () => {
    const res = await handleAdminRequest(
      new Request('https://gateway.test/api/admin/r2/list?prefix=covers/', {
        headers: { 'x-user-role': 'employee' },
      }),
      r2Env,
      null,
      '/admin/r2/list',
    );
    expect(res?.status).toBe(403);
  });

  it('rejects employee reading an arbitrary object', async () => {
    const path = '/admin/r2/file/covers/secret.png';
    const res = await handleAdminRequest(
      new Request(`https://gateway.test/api${path}`, {
        headers: { 'x-user-role': 'employee' },
      }),
      r2Env,
      null,
      path,
    );
    expect(res?.status).toBe(403);
  });

  it('allows admin to list', async () => {
    const listEnv = {
      ...env,
      R2_BUCKET: { list: async () => ({ objects: [], truncated: false }) },
    } as unknown as Env;
    const res = await handleAdminRequest(
      new Request('https://gateway.test/api/admin/r2/list?prefix=covers/', {
        headers: { 'x-user-role': 'admin' },
      }),
      listEnv,
      null,
      '/admin/r2/list',
    );
    expect(res?.status).toBe(200);
  });
});
