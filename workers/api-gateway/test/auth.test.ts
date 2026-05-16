import { describe, it, expect } from 'vitest';
import { validateJWT } from '../src/auth';

function base64Url(source: string | Uint8Array) {
  let str: string;
  if (typeof source === 'string') str = Buffer.from(source).toString('base64');
  else str = Buffer.from(source).toString('base64');
  return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

describe('validateJWT - JWKS signature verification', () => {
  it('verifies a generated RS256 token using a JWKS stub', async () => {
    // generate RSA key pair
    const keyPair = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify']
    );

    const pubJwk: any = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privJwk: any = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    pubJwk.kid = 'test-key';
    pubJwk.alg = 'RS256';

    const header = { alg: 'RS256', typ: 'JWT', kid: 'test-key' };
    const payload = { sub: 'user-123', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) + 60 };

    const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, encoder.encode(signingInput));
    const signatureB64 = base64Url(new Uint8Array(signature));
    const token = `${signingInput}.${signatureB64}`;

    // Mock global fetch to return JWKS
    const jwks = { keys: [{ kty: 'RSA', n: pubJwk.n, e: pubJwk.e, alg: 'RS256', kid: 'test-key' }] };
    (globalThis as any).SUPABASE_JWKS_URL = 'https://example.test/.well-known/jwks.json';
    (globalThis as any).fetch = async (_url: string) => ({ ok: true, json: async () => jwks });

    const ctx = await validateJWT(token);
    expect(ctx.userId).toBe('user-123');
    expect(ctx.email).toBe('test@example.com');
  });
});
