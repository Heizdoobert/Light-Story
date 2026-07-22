# Gateway Rate Limiting & Security Hardening Design Spec

## Overview
Edge security middleware for `unified-gateway` Cloudflare Worker implementing sliding-window IP rate limiting, strict security headers, and route-level authorization guards.

## Architecture & Data Flow

### 1. Sliding-Window Rate Limiter Middleware
Location: `workers/unified-gateway/src/middleware/rateLimit.ts`

- Store request timestamps in memory map / KV cache keyed by client IP (`CF-Connecting-IP` or `X-Forwarded-For`).
- Parameters:
  - Default API endpoints: 100 requests per 60 seconds per IP.
  - Auth/Admin endpoints (`/api/admin/*`): 20 requests per 60 seconds per IP.
- Excess requests return `429 Too Many Requests` response with standard headers:
  - `Retry-After: <seconds>`
  - `X-RateLimit-Limit: <max>`
  - `X-RateLimit-Remaining: <remaining>`

### 2. Security Headers Middleware
Location: `workers/unified-gateway/src/middleware/securityHeaders.ts`

Applies strict security response headers to all worker responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 3. Execution Pipeline in `index.ts`
```
[Client Request]
       │
       ▼
[OPTIONS Preflight Handler]
       │
       ▼
[IP Rate Limiter Middleware (429 if exceeded)]
       │
       ▼
[JWT Auth Validation Middleware]
       │
       ▼
[Route Dispatch (stories, comics, admin, analytics)]
       │
       ▼
[Apply Security & CORS Response Headers]
       │
       ▼
[Response to Client]
```

## Component & Service Interface

### Rate Limiter Function
`checkRateLimit(request: Request, isAuthRoute: boolean): { allowed: boolean; remaining: number; resetSec: number }`

### Security Headers Function
`applySecurityHeaders(headers: Headers): void`

## Testing Strategy
- Unit tests for rate limiter logic (window boundary, reset time, IP extraction).
- Unit tests for security header attachment.
- Worker integration test confirming 429 response on request overflow.
