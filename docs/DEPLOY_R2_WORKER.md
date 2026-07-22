# Deploying the R2 Proxy Worker

Deploy the `lightstory-r2-proxy` Cloudflare Worker that proxies R2 assets with JWT + HMAC access control.

## Prerequisites

- Wrangler CLI installed and logged in (`npx wrangler login`)
- R2 bucket created (e.g., `lightstory-assets`) in Cloudflare Dashboard
- `ASSETS_SIGN_SECRET` generated: `openssl rand -hex 32`

## Steps

### 1. Configure `workers/r2-signed-url/wrangler.toml`

```toml
name = "lightstory-r2-proxy"
main = "worker.js"
compatibility_date = "2026-05-16"

[r2_buckets]
binding = "ASSETS_BUCKET"
bucket_name = "lightstory-assets"   # Replace with your bucket name

[[kv_namespaces]]
binding = "KV"                       # Optional: for token cache
# namespace_id = "<your-ns-id>"
```

### 2. Set secrets

```bash
cd workers/r2-signed-url

# HMAC secret for signed URLs (required)
npx wrangler secret put ASSETS_SIGN_SECRET
# Paste the hex string from openssl rand -hex 32

# JWKS URL (if using JWT instead of signed URLs)
npx wrangler secret put SUPABASE_JWKS_URL
# Value: https://<project>.supabase.co/.well-known/jwks.json
```

### 3. Deploy

```bash
cd workers/r2-signed-url
npx wrangler deploy

# For staging
npx wrangler deploy --env staging
```

### 4. Verify

```bash
# Public asset (no auth required)
curl -I https://lightstory-r2-proxy.<account>.workers.dev/public/test.txt
# Expected: 200, cache-control: public, max-age=86400

# VIP asset (no auth → 403)
curl -I https://lightstory-r2-proxy.<account>.workers.dev/vip/premium.txt
# Expected: 403

# VIP asset with valid JWT
curl -I -H "Authorization: Bearer <premium-jwt>" \
  https://lightstory-r2-proxy.<account>.workers.dev/vip/premium.txt
# Expected: 200, cache-control: private, max-age=60
```

## Security Notes

- The Worker uses proper JWT verification via `jose` library and Supabase JWKS endpoint (not `parseJwt` placeholder).
- HMAC signed URLs use `HMAC-SHA256` over `${key}:${expiry}`, verified with `SubtleCrypto`.
- Use short expiry (60s) for VIP assets; longer TTL for public.
- Keep `ASSETS_SIGN_SECRET` in `wrangler secret` — never in source code.

## Runtime Bindings

| Binding | Type | Description |
|---|---|---|
| `ASSETS_BUCKET` | R2 bucket | The R2 bucket for comic assets |
| `KV` (optional) | KV namespace | Token cache for JWT revocation |

## HMAC Signed URL Pattern

Generate signed URLs server-side:

```js
import crypto from 'crypto';
function signR2Key(key, expiryMs, secret) {
  const payload = `${key}:${expiryMs}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${sig}.${expiryMs}`;
}
```

See `workers/r2-signed-url/README_HMAC.md` for full details.
