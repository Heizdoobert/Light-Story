interface Env {
  ASSETS_SIGN_SECRET: string;
  ASSETS_BUCKET: R2Bucket;
  SUPABASE_JWKS_URL?: string;
}

function parseJwt(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded);
}

function base64UrlToUint8Array(input: string): Uint8Array {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function fetchJWKS(jwksUrl: string): Promise<{ keys: any[] }> {
  const cacheKey = '__JWKS_CACHE_R2__';
  const now = Date.now();
  const cache: any = (globalThis as any)[cacheKey] ?? null;
  if (cache && cache.url === jwksUrl && now - cache.fetchedAt < 3600000) {
    return cache.jwks;
  }
  const res = await fetch(jwksUrl, { method: 'GET' });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const jwks = await res.json();
  (globalThis as any)[cacheKey] = { url: jwksUrl, jwks, fetchedAt: now };
  return jwks;
}

async function verifyJwt(token: string, jwksUrl: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) throw new Error('Token expired');
  if (payload.nbf && now < payload.nbf) throw new Error('Token not yet valid');
  if (!payload.sub) throw new Error('Missing sub');

  const jwks = await fetchJWKS(jwksUrl);
  if (!Array.isArray(jwks.keys)) throw new Error('Invalid JWKS');
  const kid = header.kid;
  let key = kid ? jwks.keys.find((k: any) => k.kid === kid) : null;
  if (!key && jwks.keys.length === 1) key = jwks.keys[0];
  if (!key) throw new Error('JWK not found');

  const isRsa = key.kty === 'RSA' && key.n && key.e;
  const isEc = key.kty === 'EC' && key.crv && key.x && key.y;
  if (!isRsa && !isEc) throw new Error('Unsupported key type');

  const importAlg = isEc
    ? { name: 'ECDSA', namedCurve: key.crv }
    : { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } };
  const verifyAlg = isEc
    ? { name: 'ECDSA', hash: { name: 'SHA-256' } }
    : importAlg;
  const cryptoKey = await crypto.subtle.importKey('jwk', key, importAlg, false, ['verify']);
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const sig = base64UrlToUint8Array(parts[2]);
  const ok = await crypto.subtle.verify(verifyAlg, cryptoKey, sig, data);
  if (!ok) throw new Error('Invalid signature');
  return payload;
}

async function computeHmac(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload));
  const arr = Array.from(new Uint8Array(sig));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\//, '');

    if (!key) return new Response('Missing object key', { status: 400 });

    const sigParam = url.searchParams.get('sig');
    const secret = env.ASSETS_SIGN_SECRET;

    if (sigParam && secret) {
      const parts = sigParam.split('.');
      if (parts.length !== 2) return new Response('Unauthorized', { status: 401 });
      const [sig, expiry] = parts;
      const expiryTs = Number(expiry);
      if (!expiryTs || expiryTs < Date.now()) return new Response('Unauthorized', { status: 401 });

      const expected = await computeHmac(`${key}:${expiry}`, secret);
      if (!constantTimeEqual(expected, sig)) return new Response('Forbidden', { status: 403 });
    } else {
      const auth = request.headers.get('authorization') || '';
      if (!auth.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
      const jwksUrl = env.SUPABASE_JWKS_URL;
      if (!jwksUrl) return new Response('Server not configured', { status: 500 });
      try {
        const token = auth.slice(7);
        const payload = await verifyJwt(token, jwksUrl);
        if (!payload.sub) return new Response('Invalid token', { status: 401 });
      } catch {
        return new Response('Invalid token', { status: 401 });
      }
    }

    try {
      const object = await env.ASSETS_BUCKET.get(key);
      if (!object) return new Response('Not Found', { status: 404 });

      const headers = new Headers();
      headers.set('cache-control', 'public, max-age=86400');
      if (object.httpMetadata?.contentType) headers.set('content-type', object.httpMetadata.contentType);

      return new Response(object.body, { status: 200, headers });
    } catch (err) {
      return new Response('Error fetching object', { status: 500 });
    }
  }
};
