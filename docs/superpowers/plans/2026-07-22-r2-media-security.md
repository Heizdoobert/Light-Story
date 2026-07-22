# R2 Media Asset Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement HMAC-SHA256 signature verification, URL expiration checking, and path sanitization in `r2-signed-url` Cloudflare Worker (`workers/r2-signed-url`).

**Architecture:** Create `security.ts` module under `workers/r2-signed-url/src/`, update worker `src/index.ts` handler, and add unit test suite.

**Tech Stack:** Cloudflare Workers, Web Crypto API (HMAC-SHA256), TypeScript.

---

### Task 1: Create `security.ts` HMAC & Path Sanitization Utility

**Files:**
- Create: `workers/r2-signed-url/src/security.ts`

- [ ] **Step 1: Write `security.ts`**

```ts
export function sanitizeR2Key(key: string): string | null {
  if (!key) return null;
  if (key.includes('..') || key.includes('//') || /[\x00-\x1F\x7F]/.test(key)) {
    return null;
  }
  return key.replace(/^\/+/, '');
}

export async function verifyHmacSignature(
  message: string,
  signatureHex: string,
  secretKey: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign'],
    );

    const messageData = encoder.encode(message);
    const expectedSigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSigHex = Array.from(new Uint8Array(expectedSigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return timingSafeEqual(expectedSigHex, signatureHex);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifySignedUrl(
  url: URL,
  secretKey?: string,
): Promise<{ valid: boolean; reason?: string }> {
  if (!secretKey) return { valid: true };

  const expiresStr = url.searchParams.get('expires');
  const signature = url.searchParams.get('signature');

  if (!expiresStr || !signature) {
    return { valid: false, reason: 'Missing signature or expiration parameters' };
  }

  const expires = parseInt(expiresStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (isNaN(expires) || now > expires) {
    return { valid: false, reason: 'Signed URL has expired' };
  }

  const message = `GET:${url.pathname}:${expires}`;
  const isValidSig = await verifyHmacSignature(message, signature, secretKey);

  if (!isValidSig) {
    return { valid: false, reason: 'Invalid HMAC signature' };
  }

  return { valid: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/r2-signed-url/src/security.ts
git commit -m "feat(r2-proxy): add security.ts with HMAC verification and path sanitization"
```

---

### Task 2: Integrate Security Checks into `r2-signed-url` Index Handler

**Files:**
- Modify: `workers/r2-signed-url/src/index.ts`

- [ ] **Step 1: Update `workers/r2-signed-url/src/index.ts`**

```ts
import { verifySignedUrl, sanitizeR2Key } from './security';

export interface Env {
  ASSETS_BUCKET: R2Bucket;
  R2_SECRET_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const verification = await verifySignedUrl(url, env.R2_SECRET_KEY);
    if (!verification.valid) {
      return new Response(
        JSON.stringify({ error: verification.reason || 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const key = sanitizeR2Key(pathname);
    if (!key) {
      return new Response('Invalid key path', { status: 400 });
    }

    const object = await env.ASSETS_BUCKET.get(key);
    if (!object) {
      return new Response('Object not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(object.body, { headers });
  },
};
```

- [ ] **Step 2: Run verification suite**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 3: Commit & Update Graphify**

```bash
git add workers/r2-signed-url/src/index.ts
git commit -m "feat(r2-proxy): enforce HMAC verification and key sanitization in fetch handler"
graphify update .
```
