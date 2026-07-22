# Audit & Validation Checklist

Run this checklist after every staging or production deployment. Check each item and archive results in CI artifacts.

## 1. Security Audit

### RLS Policies
- [ ] `site_settings` — public can SELECT, only admin+ can write
- [ ] `stories` — public can SELECT published/ongoing only; staff can see all
- [ ] `chapters` — public can SELECT free chapters; VIP requires premium+ role
- [ ] `stories` (comic platform) — `read_published_stories` allows status='published' only
- [ ] `chapters` (comic platform) — `read_vip_chapters_premium_admin` restricts VIP content
- [ ] `admin_audit_logs` — superadmin only
- [ ] `analytics_snapshots` — admin/superadmin only
- [ ] `profiles` — self-read or staff-read; self-update non-privileged fields only
- [ ] `comments` — published stories only for SELECT; owner/admin for write
- [ ] `ratings` — same pattern as comments

### Auth Hardening
- [ ] `handle_new_user` trigger creates profile with role='user' (never escalated)
- [ ] `set_user_role` restricted to superadmin only
- [ ] JWT verification on API Gateway: invalid/expired tokens return 401
- [ ] Gateway RBAC: employee cannot create stories, user cannot create chapters

### API Gateway (Workers)
- [ ] CORS: only whitelisted origins (`https://lightstory.app`, staging) return 200
- [ ] Rate limiting: 100 req/min per user, `Retry-After` header on 429
- [ ] `x-request-id` header on all responses for traceability
- [ ] No secrets logged in Worker output

### R2 Proxy
- [ ] Public assets: no auth required for non-`vip/` keys
- [ ] VIP assets: require premium JWT or valid HMAC signed URL
- [ ] Signed URL HMAC verified; expired URLs return 401
- [ ] `parseJwt` replaced with proper JWKS verification (security note)

## 2. Data Integrity

- [ ] `increment_story_views` idempotent (rapid clicks don't over-count)
- [ ] `toggle_story_like` idempotent (double-like doesn't create duplicate)
- [ ] Foreign key cascades: deleting story cascades to chapters, likes, views, comments
- [ ] `search_stories` returns only published stories
- [ ] D1 database migrations applied per worker: comics, stories, admin, analytics

## 3. Performance Baselines

| Check | Target | Method |
|---|---|---|
| API Gateway response time | < 200ms p95 | `curl -w "%{time_total}"` |
| D1 query latency | < 50ms avg | Cloudflare Dashboard → D1 → Metrics |
| Supabase query latency | < 50ms avg | Supabase Dashboard → Database → Performance |
| Frontend TTFB (cached) | < 200ms | Browser DevTools → Network |
| Frontend LCP | < 2.5s | Lighthouse / RUM |
| R2 cache hit ratio | > 70% | Cloudflare Dashboard → R2 → Metrics |

## 4. Worker Health

- [ ] All Workers deployed: api-gateway, comics-worker, stories-worker, analytics-worker, admin-worker, r2-proxy
- [ ] Worker logs show no startup errors (`npx wrangler tail`)
- [ ] Service bindings resolve: `COMICS_WORKER`, `STORIES_WORKER`, `ADMIN_WORKER`, `ANALYTICS_WORKER`, `R2_PROXY`
- [ ] Gateway routes all domain paths correctly

## 5. Rollback Procedures

### Frontend Rollback
```bash
# Cloudflare Pages
npx wrangler pages deploy .next --project-name light-story --branch previous

# Or rollback to specific deployment in Cloudflare Dashboard
```

### Worker Rollback
```bash
# To specific version
npx wrangler rollback --version-id <id>

# To previous release
npx wrangler rollback
```

### Supabase Rollback
```bash
# Revert specific migration
supabase db remote revert --target <migration-timestamp>

# Full reset (dev only)
supabase db reset
```

### Git Rollback
```bash
git revert HEAD
git push origin main
# Then redeploy frontend + workers
```

## 6. Deployment Sign-off

- [ ] All checks above pass
- [ ] Postman API tests pass (`npx newman run API_test.json`)
- [ ] Core business flows verified manually (comic creation, chapter upload, reading flow)
- [ ] Alert thresholds validated (no false positives)
- [ ] Architect or Lead notified of deployment