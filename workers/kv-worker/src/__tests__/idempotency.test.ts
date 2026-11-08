import { describe, it, expect, beforeEach } from 'vitest';
import { checkIdempotency, saveIdempotency } from '../middleware/idempotency';
import { fakeKV } from './helpers/fake-kv';

describe('Idempotency-Key Middleware', () => {
  let kv: ReturnType<typeof fakeKV>;

  beforeEach(() => {
    kv = fakeKV();
  });

  it('skips GET and non-mutating requests even if header is present', async () => {
    const req = new Request('https://api.example.com/api/v1/stories', {
      method: 'GET',
      headers: { 'Idempotency-Key': 'key-123' },
    });
    const result = await checkIdempotency(req, kv as any, null, 'user-1');
    expect(result.hit).toBe(false);
  });

  it('skips mutating requests when Idempotency-Key header is absent', async () => {
    const req = new Request('https://api.example.com/api/v1/stories', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Story' }),
    });
    const result = await checkIdempotency(req, kv as any, null, 'user-1');
    expect(result.hit).toBe(false);
  });

  it('misses on first mutating request and hits on second with cached response', async () => {
    const req = new Request('https://api.example.com/api/v1/stories', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'tx-unique-999' },
      body: JSON.stringify({ title: 'Test Story' }),
    });

    // 1st request -> cache miss
    const check1 = await checkIdempotency(req, kv as any, null, 'user-abc');
    expect(check1.hit).toBe(false);

    // Simulated handler execution returning response
    const originalRes = new Response(
      JSON.stringify({ success: true, data: { id: 'story-123', title: 'Test Story' } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );

    // Save to idempotency store
    await saveIdempotency(req, originalRes, kv as any, 'user-abc');

    // 2nd identical request -> cache hit
    const check2 = await checkIdempotency(req, kv as any, null, 'user-abc');
    expect(check2.hit).toBe(true);
    expect(check2.response).toBeDefined();
    expect(check2.response?.status).toBe(201);
    expect(check2.response?.headers.get('X-Cache-Lookup')).toBe('HIT-IDEMPOTENT');

    const body = await check2.response?.json();
    expect(body).toEqual({ success: true, data: { id: 'story-123', title: 'Test Story' } });
  });

  it('isolates idempotency keys per user', async () => {
    const req = new Request('https://api.example.com/api/v1/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'shared-key' },
    });

    const res = new Response(JSON.stringify({ success: true, orderId: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    await saveIdempotency(req, res, kv as any, 'user-A');

    // User A hits cache
    const checkUserA = await checkIdempotency(req, kv as any, null, 'user-A');
    expect(checkUserA.hit).toBe(true);

    // User B with same key misses cache
    const checkUserB = await checkIdempotency(req, kv as any, null, 'user-B');
    expect(checkUserB.hit).toBe(false);
  });
});
