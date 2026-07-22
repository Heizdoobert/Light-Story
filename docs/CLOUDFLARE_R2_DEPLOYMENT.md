# Cloudflare R2 Deployment Guide

Comprehensive guide for deploying and managing R2 comic assets with the Worker-based access control.

## Architecture

```
Client → R2 Proxy Worker (lightstory-r2-proxy) → R2 Bucket (lightstory-assets)
              │
              ├─ Public assets:  no auth, cache-control: public, max-age=86400
              ├─ VIP assets:     JWT Bearer or HMAC signed URL required
              └─ Signed URL:     `?sig=<hmac>.<expiry>` bypasses Bearer check
```

The Worker is implemented in `workers/r2-signed-url/worker.js` using the module syntax (`export default { fetch }`).

## Create R2 Bucket

```bash
# Via wrangler
npx wrangler r2 bucket create lightstory-assets

# Or via Cloudflare Dashboard → R2 → Create bucket
```

## Upload Strategy

Use deterministic object keys:

```
assets/
  public/
    {story_id}/{chapter_id}/{image_name}@{width}.webp
  vip/
    {story_id}/{chapter_id}/{image_name}@{width}.webp    # premium/admin only
```

- Upload raw images and derived WebP sizes. Keep originals in `originals/` for re-derivation.
- Upload via the admin API: `POST /api/internal/admin/upload-to-r2` with `x-r2-bucket` header.

## Worker Configuration

The Worker handles two auth mechanisms:

1. **JWT Bearer** (`Authorization: Bearer <jwt>`): Validates Supabase JWT, checks `role` claim for VIP gating.
2. **HMAC Signed URL** (`?sig=<hmac>.<expiry>`): Verifies HMAC-SHA256 signature for pre-signed time-limited access.

See `docs/DEPLOY_R2_WORKER.md` for deployment steps and `workers/r2-signed-url/README_HMAC.md` for the HMAC pattern.

## Caching Strategy

| Asset Type | Cache-Control | CDN Behavior |
|---|---|---|
| Public (non-`vip/`) | `public, max-age=86400` | Edge-cached for 24h |
| VIP (`vip/` prefix) | `private, max-age=60` | Browser-only cache, 60s |

## Cost Minimization

- All assets served through Cloudflare Workers + CDN — no direct R2 public access.
- Cache hit ratio target: > 70% for public assets.
- Use Cloudflare Images or Worker-side image transformation to reduce payload size.

## Security

- R2 credentials are never exposed client-side. Only the Worker has R2 bindings.
- VIP assets require valid JWT (verified against Supabase JWKS) or HMAC signature.
- HMAC secret (`ASSETS_SIGN_SECRET`) stored via `wrangler secret put`.
- Short-lived signed URLs (60s expiry) for VIP asset sharing.

## Deployment

```bash
cd workers/r2-signed-url
npx wrangler deploy
```

See `docs/DEPLOY_R2_WORKER.md` for full deployment steps.
