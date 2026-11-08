import { describe, it, expect, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
}));

import worker from '../index';
import { fakeKV } from './helpers/fake-kv';

describe('Gateway Route Prefixing & Trace Propagation (/api/v1)', () => {
  const fakeEnv = {
    APP_KV: fakeKV(),
    ALLOWED_ORIGIN_SUFFIXES: 'lightstory.app',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
  };

  const fakeCtx = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  };

  it('serves health check at /api/health and sets trace headers', async () => {
    const req = new Request('https://gateway.example.com/api/health', {
      headers: { 'x-trace-id': 'custom-trace-123' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-trace-id')).toBe('custom-trace-123');
    expect(res.headers.get('x-request-id')).toBe('custom-trace-123');

    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.correlationId).toBe('custom-trace-123');
  });

  it('serves health check at /api/v1/health with auto-generated trace ID', async () => {
    const req = new Request('https://gateway.example.com/api/v1/health');
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(200);

    const traceId = res.headers.get('x-trace-id');
    expect(traceId).toBeTruthy();
    expect(res.headers.get('x-request-id')).toBe(traceId);

    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.correlationId).toBe(traceId);
  });

  it('rejects forbidden origins with standard JSON envelope and traceId', async () => {
    const req = new Request('https://gateway.example.com/api/v1/health', {
      headers: { Origin: 'https://evil-phishing.com' },
    });
    const res = await worker.fetch(req, fakeEnv as any, fakeCtx as any);
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
    expect(data.timestamp).toBeTruthy();
  });
});
