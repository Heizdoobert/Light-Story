import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
    }
  }
  return { NextResponse: MockNextResponse };
});

const TEST_SECRET = 'test-webhook-secret-12345';

function makeHmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/webhooks/supabase', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('POST /api/webhooks/supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    delete process.env.SUPABASE_WEBHOOK_SECRET;
  });

  it('returns 200 in development when webhook secret is not set', async () => {
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'INSERT', table: 'stories' });
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.received).toBe(true);
  });

  it('returns 500 in production when webhook secret is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'INSERT', table: 'stories' });
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/not configured/i);
  });

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const res = await POST(makeRequest('not-json'));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/invalid json/i);
  });

  it('returns 400 when body is unreadable', async () => {
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const brokenRequest = new Request('http://localhost/api/webhooks/supabase', {
      method: 'POST',
      body: null,
    });
    Object.defineProperty(brokenRequest, 'text', { value: () => Promise.reject(new Error('read fail')) });
    const res = await POST(brokenRequest);
    expect(res.status).toBe(400);
  });

  it('returns event type from type field', async () => {
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'UPDATE', table: 'chapters' });
    const res = await POST(makeRequest(payload));
    const body = await res.json() as Record<string, string>;
    expect(body.event).toBe('UPDATE');
  });

  it('falls back to event field when type is missing', async () => {
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ event: 'AUTH_LOGIN', table: 'profiles' });
    const res = await POST(makeRequest(payload));
    const body = await res.json() as Record<string, string>;
    expect(body.event).toBe('AUTH_LOGIN');
  });

  it('returns unknown when neither type nor event is present', async () => {
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ table: 'stories' });
    const res = await POST(makeRequest(payload));
    const body = await res.json() as Record<string, string>;
    expect(body.event).toBe('unknown');
  });

  it('returns ISO timestamp in response', async () => {
    const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'INSERT', table: 'test' });
    const res = await POST(makeRequest(payload));
    const body = await res.json() as Record<string, string>;
    expect(ISO_REGEX.test(body.timestamp)).toBe(true);
  });

  it('accepts payload with record and old fields', async () => {
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({
      type: 'UPDATE',
      table: 'stories',
      record: { id: '123', title: 'Test' },
      old: { id: '123', title: 'Old Title' },
      columns: ['title'],
    });
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
  });

  it('exposes only POST method', async () => {
    const route = await import('@/app/api/webhooks/supabase/route');
    expect(route.POST).toBeDefined();
    expect((route as Record<string, unknown>).GET).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
  });
});

describe('POST /api/webhooks/supabase (signature verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    delete process.env.SUPABASE_WEBHOOK_SECRET;
  });

  it('returns 401 when signature is invalid', async () => {
    process.env.SUPABASE_WEBHOOK_SECRET = TEST_SECRET;
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'INSERT', table: 'stories' });
    const res = await POST(makeRequest(payload, { 'x-supabase-signature': 'invalidsignature' }));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/invalid signature/i);
  });

  it('returns 401 when signature header is missing with secret configured', async () => {
    process.env.SUPABASE_WEBHOOK_SECRET = TEST_SECRET;
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'INSERT', table: 'stories' });
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid HMAC-SHA256 signature', async () => {
    process.env.SUPABASE_WEBHOOK_SECRET = TEST_SECRET;
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'INSERT', table: 'stories' });
    const signature = makeHmac(payload, TEST_SECRET);
    const res = await POST(makeRequest(payload, { 'x-supabase-signature': signature }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.received).toBe(true);
  });

  it('rejects signatures with wrong secret', async () => {
    process.env.SUPABASE_WEBHOOK_SECRET = TEST_SECRET;
    const { POST } = await import('@/app/api/webhooks/supabase/route');
    const payload = JSON.stringify({ type: 'INSERT', table: 'stories' });
    const signature = makeHmac(payload, 'wrong-secret');
    const res = await POST(makeRequest(payload, { 'x-supabase-signature': signature }));
    expect(res.status).toBe(401);
  });
});
