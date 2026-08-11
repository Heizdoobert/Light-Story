# TEST_READY.md — Light-Story Test Readiness Status

Updated: 2026-08-02

## Status: READY for unit/interaction/integration levels; Playwright E2E pending env

## Full suite (frontend, `npm run test:run`)
- 31 files, **283 passed | 1 skipped** (284 total), ~32s
- Cumulative E2E-track tests: **146 passed + 1 skip**
  - tier1: 62 · tier2: 59 · tier3: 8 · tier4: 17 (+1 skip)

## Coverage by tier
| Tier | Scope | Files | Tests |
|------|-------|-------|-------|
| 1 | Feature coverage (7 features) | 7 | 62 |
| 2 | Boundary & corner cases (7 features) | 7 | 59 |
| 3 | Cross-feature interactions | 1 | 8 |
| 4 | Real-world journeys | 1 | 17 + 1 skip |

## Env-gated / not run
- Tier 4 journey 7 (Supabase real flow): skipped without `NEXT_PUBLIC_SUPABASE_URL`/`R2_ACCOUNT_ID`.
- Tier 4 journey 4 (live `/api/health`): passes against dev server.
- Live worker (:8787) contract probes are exercised via direct handler import; live-worker smoke needs `npm run dev` + worker running.
- `frontend/tests/e2e/` (Playwright workflows) not yet authored — requires full local env (dev server + worker + Supabase).

## Notable contract facts pinned by tests
- `/api/health` lives in the Next.js app (`frontend/src/app/api/health/route.ts`); the KV worker has **no** `/health` route (404 fallthrough).
- R2 upload is a raw fetch POST to `${gatewayUrl}/api/admin/r2/upload` with Bearer + `x-r2-bucket` + FormData — not apiClient.
- `Chapter.status` union matches `20260730000004_add_chapter_status.sql` (no `'archived'`).
- Barrel exports 35 runtime values; `@/hooks` transitively needs `NEXT_PUBLIC_ENC_KEY`.

## Blockers
- Root ESLint broken (minimatch mismatch, pre-existing) — lint is a no-op stub.
- No .env for Supabase/R2 in CI → 1 test skips.
