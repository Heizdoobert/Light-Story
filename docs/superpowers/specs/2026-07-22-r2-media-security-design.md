# R2 Media Asset Security & Pre-Signed URL Hardening Design Spec

## Overview
Security enhancement for `r2-signed-url` Cloudflare Worker (`workers/r2-signed-url`) implementing HMAC-SHA256 signature verification, URL expiration checking, and bucket asset key sanitization for Cloudflare R2 media assets.

## Architecture & Data Flow

### 1. Signed URL Structure
Media signed URLs follow the standard HMAC signature format:
`https://lightstory-r2-proxy.truyen3new.workers.dev/assets/{bucket}/{key}?expires={unixTimestamp}&signature={hmacHex}`

### 2. Verification Steps in Worker (`workers/r2-signed-url/src/index.ts`)
When a request arrives at `lightstory-r2-proxy`:
1. **Expiration Check**: Parse `expires` query parameter. If `Date.now() / 1000 > expires`, reject with `401 Unauthorized` ("URL has expired").
2. **HMAC Signature Check**: Compute HMAC-SHA256 of `GET:{bucket}/{key}:{expires}` using worker `R2_SECRET_KEY` secret binding.
3. **Constant-Time Comparison**: Compare computed HMAC hex with `signature` query parameter in constant time to prevent timing attacks.
4. **Key Sanitization**: Ensure asset key does not contain path traversal patterns (`..`, double slashes, control characters).
5. **R2 Asset Stream**: If valid, fetch asset from `ASSETS_BUCKET` R2 binding and stream response to client with HTTP caching headers (`Cache-Control: public, max-age=86400`).

### 3. Local Development Fallback
If `R2_SECRET_KEY` is not set or in development mode (`NODE_ENV !== 'production'`), bypass HMAC verification to preserve local developer experience.

## Component & Service Interface

### Verification Utility (`workers/r2-signed-url/src/security.ts`)
- `verifySignedUrl(pathname: string, searchParams: URLSearchParams, secretKey?: string): { valid: boolean; reason?: string }`
- `sanitizeR2Key(key: string): string | null`

## Testing Strategy
- Unit tests for HMAC signature verification (valid signature, expired URL, tampered key, missing params).
- Key sanitization unit tests (path traversal payloads, double slashes).
