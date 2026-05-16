import { describe, it, expect } from 'vitest';
import { onRequest } from '../src/index';

function base64Url(source: string | Uint8Array) {
  let str: string;
  if (typeof source === 'string') str = Buffer.from(source).toString('base64');
  else str = Buffer.from(source).toString('base64');
  return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

describe('Gateway integration (simulated)', () => {
  it('forwards request to COMICS_WORKER and injects headers', async () => {
    // Create a simple JWT-like token with sub claim, no signature verification (no JWKS configured)
    const header = { alg: 'none', typ: 'JWT' };
    const payload = { sub: 'user-123', email: 'int@example.com', exp: Math.floor(Date.now() / 1000) + 60 };
    const token = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}.sig`;

    // Stub COMICS_WORKER with a fetch function that captures the forwarded request
    let capturedRequest: Request | null = null;
    (globalThis as any).COMICS_WORKER = {
      fetch: async (req: Request) => {
        capturedRequest = req;
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    };

    // Ensure no JWKS URL is set so validateJWT skips signature verification
    (globalThis as any).SUPABASE_JWKS_URL = undefined;

    const req = new Request('https://gateway.test/api/v1/comics/123/chapters', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    const res = await onRequest(req);

    expect(res.status).toBe(200);
    expect(capturedRequest).not.toBeNull();
    if (capturedRequest) {
      expect(capturedRequest.headers.get('x-user-id')).toBe('user-123');
      expect(capturedRequest.headers.get('x-forwarded-by')).toBe('api-gateway');
    }
  });
});
