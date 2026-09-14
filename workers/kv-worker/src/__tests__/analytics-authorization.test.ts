import { describe, expect, it } from 'vitest';
import { handleAnalyticsRequest } from '../routes/analytics';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
} as unknown as Env;

function get(path: string, role?: string): Request {
  return new Request(`https://gateway.test/api${path}`, {
    headers: role ? { 'x-user-role': role } : {},
  });
}

describe('GET /analytics/infrastructure', () => {
  it('rejects anonymous callers', async () => {
    const res = await handleAnalyticsRequest(
      get('/analytics/infrastructure'),
      env,
      null,
      '/analytics/infrastructure',
    );
    expect(res?.status).toBe(403);
  });

  it('rejects a plain user', async () => {
    const res = await handleAnalyticsRequest(
      get('/analytics/infrastructure', 'user'),
      env,
      null,
      '/analytics/infrastructure',
    );
    expect(res?.status).toBe(403);
  });
});
