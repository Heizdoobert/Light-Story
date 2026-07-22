# Gateway Rate Limiting & Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement sliding-window IP rate limiting, strict security response headers, and route-level authorization protection in `unified-gateway` Cloudflare Worker.

**Architecture:** Create `rateLimit.ts` and `securityHeaders.ts` middleware modules under `workers/unified-gateway/src/middleware/`, integrate into `index.ts` fetch handler, and add unit test coverage.

**Tech Stack:** Cloudflare Workers, TypeScript.

---

### Task 1: Create `securityHeaders.ts` Middleware

**Files:**
- Create: `workers/unified-gateway/src/middleware/securityHeaders.ts`

- [ ] **Step 1: Write `securityHeaders.ts`**

```ts
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function applySecurityHeaders(headers: Headers): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/unified-gateway/src/middleware/securityHeaders.ts
git commit -m "feat(worker): add securityHeaders middleware"
```

---

### Task 2: Create `rateLimit.ts` Sliding Window Middleware

**Files:**
- Create: `workers/unified-gateway/src/middleware/rateLimit.ts`

- [ ] **Step 1: Write `rateLimit.ts`**

```ts
type RateLimitStore = Map<string, number[]>;

const ipStore: RateLimitStore = new Map();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
};

export function getClientIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

export function checkRateLimit(request: Request, isAuthOrAdmin = false): RateLimitResult {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 60_000;
  const limit = isAuthOrAdmin ? 20 : 100;

  const timestamps = (ipStore.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const resetSec = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSec,
    };
  }

  timestamps.push(now);
  ipStore.set(ip, timestamps);

  return {
    allowed: true,
    limit,
    remaining: limit - timestamps.length,
    resetSec: 60,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/unified-gateway/src/middleware/rateLimit.ts
git commit -m "feat(worker): add rateLimit sliding window middleware"
```

---

### Task 3: Integrate Middleware into Gateway `index.ts` & Verification

**Files:**
- Modify: `workers/unified-gateway/src/index.ts`

- [ ] **Step 1: Import and integrate `checkRateLimit` and `applySecurityHeaders` in `index.ts`**

In `workers/unified-gateway/src/index.ts`:

```ts
import { checkRateLimit } from './middleware/rateLimit';
import { applySecurityHeaders } from './middleware/securityHeaders';

// Inside fetch handler, before auth check:
const isAuthOrAdmin = pathname.startsWith('/api/admin') || pathname.startsWith('/api/auth');
const rateLimit = checkRateLimit(request, isAuthOrAdmin);

if (!rateLimit.allowed) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Retry-After': String(rateLimit.resetSec),
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': '0',
    ...corsHeaders(origin),
  });
  applySecurityHeaders(headers);
  return new Response(
    JSON.stringify({
      status: 'error',
      error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Please try again later.' },
    }),
    { status: 429, headers },
  );
}

// Before returning downstream response:
applySecurityHeaders(res.headers);
```

- [ ] **Step 2: Run verification tests**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 3: Commit & Update Graphify**

```bash
git add workers/unified-gateway/src/index.ts
git commit -m "feat(worker): integrate rate limit and security headers in gateway fetch pipeline"
graphify update .
```
