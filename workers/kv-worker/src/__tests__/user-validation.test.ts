import { describe, expect, it } from 'vitest';
import { handleUserRequest } from '../routes/user';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
} as unknown as Env;

const USER = '11111111-2222-3333-4444-555555555555';

function post(path: string, body: unknown): Request {
  return new Request(`https://gateway.test/api${path}`, {
    method: 'POST',
    headers: { 'x-user-id': USER, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('user route id validation', () => {
  it('rejects a non-uuid comicId on bookmark add', async () => {
    const res = await handleUserRequest(
      post('/user/bookmarks/add', { comicId: 'x&select=*' }),
      env,
      null,
      '/user/bookmarks/add',
    );
    expect(res?.status).toBe(400);
    expect(await res!.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('rejects a malformed x-user-id header', async () => {
    const res = await handleUserRequest(
      new Request('https://gateway.test/api/user/bookmarks', {
        headers: { 'x-user-id': 'or=(1.eq.1)' },
      }),
      env,
      null,
      '/user/bookmarks',
    );
    expect(res?.status).toBe(400);
  });
});
