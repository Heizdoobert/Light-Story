# Monitoring & Post-Deployment Checks

Canonical reference for monitoring all Light Story services: frontend, API Gateway, domain Workers, Supabase, and R2.

## 1. Error Tracking

- **Sentry** configured in frontend (`frontend/src/lib/sentry.ts`). Verify DSN is set per environment.
- Uncaught exceptions are captured by `useGlobalErrorHandler` and reported to Sentry.
- API Gateway logs all 4xx/5xx responses with `x-request-id` for traceability.

## 2. Worker Observability

All Workers have `"observability": { "enabled": true }` in `wrangler.jsonc`.

```bash
# Tail logs per worker
npx wrangler tail                                # current directory worker
npx wrangler tail --env staging                  # staging environment

# View metrics in Cloudflare Dashboard
# Workers & Pages → <worker-name> → Metrics

# Check deployment history
npx wrangler deployments list
```

**Key metrics to monitor:**
- CPU time per request (< 10ms baseline, alert > 50ms)
- Request count (spikes may indicate abuse)
- 5xx rate (> 1% = alert)
- Cold starts (should stabilize after initial invocation)

## 3. API Gateway Health Checks

| Check | Endpoint | Expected |
|---|---|---|
| Gateway | `GET /api/v1/health` | `200 { "status": "ok" }` |
| Auth | `GET /api/v1/health` with Bearer | `200` with valid JWT, `401` without |
| CORS | `OPTIONS /api/v1/health` with Origin | `200` with correct `Access-Control-Allow-Origin` |

```bash
# Automated health check (add to CI)
curl -f https://api.lightstory.workers.dev/api/v1/health
```

## 4. Supabase Monitoring

```bash
# Edge Function logs
supabase functions logs payment_and_rewards --project-id <id>

# Database usage
supabase db usage --project-id <id>

# Realtime subscriptions
# Dashboard → Database → Realtime → Active subscriptions
```

## 5. D1 Database Monitoring

Monitor per-worker D1 databases in Cloudflare Dashboard:
- **D1** → <database-name> → **Queries**: total count, avg latency, errors
- Alert if `d1_avg_latency_ms` > 100ms sustained

## 6. R2 Storage Monitoring

- **R2** → <bucket> → **Usage**: storage GB, object count, egress
- Expected: stable growth; alert on sudden spikes (>50% in 24h)
- Cache hit ratio should be > 70% for public assets

## 7. Frontend Performance (RUM)

| Metric | Target | Alert |
|---|---|---|
| LCP | < 2.5s | > 3.0s |
| INP | < 200ms | > 300ms |
| CLS | < 0.1 | > 0.25 |
| TTFB | < 800ms | > 1.5s |

## 8. Alert Configuration

| Condition | Action | Channel |
|---|---|---|
| 5xx rate > 1% over 5min | Pager on-call | Discord + Email |
| LCP regression > 20% over baseline | Notify frontend team | GitHub Issue |
| D1 avg latency > 100ms | Notify backend team | Discord |
| R2 egress spike > 50% in 24h | Notify DevOps | Discord |

## 9. Post-Deploy Validation

1. Run the full Postman test suite (`API_test.md`)
2. Verify key business flows manually (create comic, upload chapter, view as user/premium)
3. Check `wrangler tail` on all Workers for startup errors
4. Run `docs/AUDIT_VALIDATION.md` checklist, archive results in CI artifacts
