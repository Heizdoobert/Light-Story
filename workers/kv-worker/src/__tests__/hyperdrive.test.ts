import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleHyperdriveRequest } from '../routes/hyperdrive';

// Mock 'pg' Client constructor
const mockConnect = vi.fn();
const mockQuery = vi.fn();
const mockEnd = vi.fn();

vi.mock('pg', () => {
  return {
    Client: class MockClient {
      connect = mockConnect;
      query = mockQuery;
      end = mockEnd;
    },
  };
});

describe('handleHyperdriveRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-GET HTTP methods with 405 METHOD_NOT_ALLOWED', async () => {
    const req = new Request('https://worker.local/api/hyperdrive/status', { method: 'POST' });
    const env = { HYPERDRIVE: { connectionString: 'postgres://user:pass@pool.hyperdrive.cf:5432/db' } } as unknown as Env;

    const res = await handleHyperdriveRequest(req, env, null, '/hyperdrive/status');
    expect(res.status).toBe(405);
    const body = await res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('returns 500 HYPERDRIVE_UNCONFIGURED if env.HYPERDRIVE binding is absent', async () => {
    const req = new Request('https://worker.local/api/hyperdrive-test', { method: 'GET' });
    const env = {} as unknown as Env;

    const res = await handleHyperdriveRequest(req, env, null, '/hyperdrive-test');
    expect(res.status).toBe(500);
    const body = await res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('HYPERDRIVE_UNCONFIGURED');
  });

  it('successfully queries Postgres via Hyperdrive connection pool', async () => {
    const req = new Request('https://worker.local/api/hyperdrive-test', { method: 'GET' });
    const env = {
      HYPERDRIVE: { connectionString: 'postgres://hyperdrive-user:pass@edge-pool.cloudflare.com:5432/supabase' },
    } as unknown as Env;

    mockConnect.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({
      rows: [{ current_timestamp: '2026-11-04T12:00:00Z', version: 'PostgreSQL 15.1 on x86_64' }],
    });
    mockEnd.mockResolvedValueOnce(undefined);

    const res = await handleHyperdriveRequest(req, env, null, '/hyperdrive-test');
    expect(res.status).toBe(200);

    const json = await res.json() as { message: string; data: Array<{ current_timestamp: string; version: string }> };
    expect(json.message).toContain('Successfully connected to Supabase Postgres via Cloudflare Hyperdrive!');
    expect(json.data.length).toBe(1);
    expect(json.data[0].version).toContain('PostgreSQL 15.1');

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith('SELECT current_timestamp, version();');
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it('handles database errors gracefully and returns 500 HYPERDRIVE_ERROR', async () => {
    const req = new Request('https://worker.local/api/hyperdrive-test', { method: 'GET' });
    const env = {
      HYPERDRIVE: { connectionString: 'postgres://bad-conn@pool.cloudflare.com:5432/db' },
    } as unknown as Env;

    mockConnect.mockRejectedValueOnce(new Error('Connection timeout to upstream database pool'));

    const res = await handleHyperdriveRequest(req, env, null, '/hyperdrive-test');
    expect(res.status).toBe(500);

    const json = await res.json() as { error: { code: string; message: string } };
    expect(json.error.code).toBe('HYPERDRIVE_ERROR');
    expect(json.error.message).toContain('Connection timeout to upstream database pool');
  });
});
