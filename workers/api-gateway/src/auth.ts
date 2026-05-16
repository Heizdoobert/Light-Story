export interface AuthContext {
  userId: string;
  role: string;
  email?: string;
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

function base64UrlDecode(input: string): string {
  // Replace URL-safe chars
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '='
  const pad = str.length % 4;
  if (pad === 2) str += '==';
  else if (pad === 3) str += '=';
  else if (pad !== 0) throw new Error('Invalid base64 string');
  // atob is available in Workers
  return atob(str);
}

function decodeJwtPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Malformed JWT');
  const payload = parts[1];
  const json = base64UrlDecode(payload);
  return JSON.parse(json);
}

function decodeJwtHeader(token: string): any {
  const parts = token.split('.');
  if (parts.length < 1) throw new Error('Malformed JWT');
  const header = parts[0];
  const json = base64UrlDecode(header);
  return JSON.parse(json);
}

async function fetchJWKS(jwksUrl: string) {
  // Simple in-memory cache on globalThis
  const cacheKey = '__JWKS_CACHE__';
  const now = Date.now();
  const cache: any = (globalThis as any)[cacheKey] ?? null;
  const defaultTtl = Number((globalThis as any).SUPABASE_JWKS_TTL_MS) || 3600 * 1000;
  if (cache && cache.url === jwksUrl && now - cache.fetchedAt < (cache.ttl || defaultTtl)) {
    return cache.jwks;
  }

  const res = await fetch(jwksUrl, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  const jwks = await res.json();
  (globalThis as any)[cacheKey] = { url: jwksUrl, jwks, fetchedAt: now, ttl: defaultTtl };
  return jwks;
}

function base64UrlToUint8Array(input: string): Uint8Array {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function verifyJwtSignature(token: string, jwk: any): Promise<boolean> {
  // Import JWK as CryptoKey
  const alg = jwk.alg ?? 'RS256';
  const keyUsages: KeyUsage[] = ['verify'];
  // Use object form for hash for better runtime compatibility
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    keyUsages
  );

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = base64UrlToUint8Array(parts[2]);
  const encoder = new TextEncoder();
  const data = encoder.encode(signingInput);

  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, data);
}

/**
 * Lightweight JWT validation stub.
 * NOTE: This implementation decodes the JWT and checks `exp`/`nbf` claims but
 * does NOT verify the signature. Use a proper JWKS+signature verification in
 * production (see TechLead_architecture.md TODOs).
 */
export async function validateJWT(token: string): Promise<AuthContext> {
  if (!token) throw new UnauthorizedError('Missing token');
  const cleaned = token.trim().replace(/^Bearer\s+/i, '');
  let payload: any;
  try {
    payload = decodeJwtPayload(cleaned);
  } catch (e) {
    throw new UnauthorizedError('Invalid token');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) throw new UnauthorizedError('Token expired');
  if (payload.nbf && now < payload.nbf) throw new UnauthorizedError('Token not yet valid');

  const userId = payload.sub ?? payload.user_id ?? payload.uid;
  if (!userId) throw new UnauthorizedError('Missing subject (sub) in token');

  const role = payload.app_metadata?.role ?? payload.role ?? 'user';
  const email = payload.email ?? undefined;

  // If JWKS URL configured in runtime (globalThis.SUPABASE_JWKS_URL or env-like), verify signature
  const jwksUrl = (globalThis as any).SUPABASE_JWKS_URL || (globalThis as any).JWKS_URL || undefined;
  if (jwksUrl) {
    try {
      const header = decodeJwtHeader(cleaned);
      const kid = header.kid;
      // Fetch JWKS (may be cached)
      let jwks = await fetchJWKS(jwksUrl);
      // Select key: prefer kid match, fall back to single-key JWKS
      let key = null as any;
      if (Array.isArray(jwks.keys)) {
        key = kid ? jwks.keys.find((k: any) => k.kid === kid) : null;
        if (!key && jwks.keys.length === 1) key = jwks.keys[0];
      }
      if (!key) {
        console.warn('validateJWT: JWK not found for token kid; jwks_keys=', Array.isArray(jwks.keys) ? jwks.keys.length : 0);
        throw new UnauthorizedError('JWK not found for token kid');
      }

      // Basic key sanity checks
      if (key.kty !== 'RSA' || !key.n || !key.e) {
        console.warn('validateJWT: Unsupported JWK type or missing parameters', { kty: key.kty });
        throw new UnauthorizedError('Unsupported JWK');
      }

      // Ensure alg matches expected
      const tokenAlg = header.alg ?? 'RS256';
      if (tokenAlg !== (key.alg ?? tokenAlg) && tokenAlg !== 'RS256') {
        console.warn('validateJWT: algorithm mismatch', { tokenAlg, keyAlg: key.alg });
        throw new UnauthorizedError('Token algorithm unsupported');
      }

      // Attempt verification; if it fails, try one re-fetch (handle rotation) then fail
      let ok = false;
      try {
        ok = await verifyJwtSignature(cleaned, key);
      } catch (e) {
        console.warn('validateJWT: first signature verify attempt failed, will retry once', { err: (e as Error).message });
      }
      if (!ok) {
        // Force refresh JWKS and try again
        try {
          // Invalidate cache and re-fetch
          const cacheKey = '__JWKS_CACHE__';
          try { delete (globalThis as any)[cacheKey]; } catch {}
          jwks = await fetchJWKS(jwksUrl);
          key = kid ? jwks.keys.find((k: any) => k.kid === kid) : jwks.keys[0];
          ok = await verifyJwtSignature(cleaned, key);
        } catch (e2) {
          console.warn('validateJWT: retry verify failed', { err: (e2 as Error).message });
        }
      }
      if (!ok) throw new UnauthorizedError('Invalid token signature');
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
      console.error('validateJWT: unexpected failure during JWKS verification', { err: (e as Error).message });
      // If JWKS fetch/verify fails unexpectedly, treat as unauthorized
      throw new UnauthorizedError('JWT verification failed');
    }
  }

  return { userId, role, email };
}
