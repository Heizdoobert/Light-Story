# Light Story — Security & API Audit Report

Audits: comic CMS surface, apiClient & auth, dependency audit, secrets & repo hygiene, API consistency.
Every finding below was verified against source on 2026-07-31 unless marked `[unverified]`.

---

## 1. Comic CMS surface (frontend CMS services ↔ gateway)

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 1.1 | ~~Chapter/panel image upload (`PUT /admin/chapters/:id/images`) and chapter DELETE have no explicit staff-role check~~ — **RETRACTED**: admin.ts:85 applies a global `requireRole(['superadmin','admin','employee'])` gate to every `/admin/*` route (chapters PUT/DELETE included; audit superadmin-only at :90, site-settings admin-only at :96, r2 admin-only at :772). RLS remains as defense-in-depth only. | — (OK) | `workers/unified-gateway/src/routes/admin.ts:85` |
| 1.2 | ~~Comic catalog stored in `localStorage` (full DB rows, incl. any extra fields returned by RLS); no server-side paging~~ — **RETRACTED 2026-07-31**: gateway `GET /admin/comics` already server-pages (`page`/`pageSize`/`limit`/`offset`, admin.ts:825-832); rows are whitelisted to a fixed shape by `mapDbRowToRecord` (no RLS extras cached). Residual accepted: admin-only same-origin data, no secrets; `fetchComicCatalog` now passes `pageSize=100` (was fetching page 1 default of 50 → cache capped at 100 comics, CMS paginates client-side over that set). | Low (residual) | `frontend/src/services/comics/comicCms.service.ts` (catalog cache) |
| 1.3 | **`GET /comics` ignores `sort` and `limit` params** (reads only `page`, `pageSize`, `keyword`; fixed `order=created_at.desc`). Frontend fallback calls `/api/comics?sort=most_viewed&limit=6` → falls back to newest-order silently, mislabeled as "most viewed". | Low | `workers/unified-gateway/src/routes/comics.ts:35-52`; `frontend/src/services/comics/comic.service.ts:212-215` |
| 1.4 | ~~Dead imports in comics route~~ — original claim overstated: `encryptField`/`decryptField`/`validateBody`/`sanitizeBody` are used (chapter create/decrypt, POST validation). Only `sb` was unused. **RESOLVED: `sb` import removed** during 5.2/5.3 work. | Low | `workers/unified-gateway/src/routes/comics.ts:11-18` |

## 2. apiClient & auth

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 2.1 | **`logDashboardAccess` was a silent no-op** (`void actorUserId`) — no call sites existed. **RESOLVED: deleted** (frontend/src/services/admin/admin.service.ts). | Medium (stub debt) | `frontend/src/services/admin/admin.service.ts` |
| 2.2 | **`getDashboardData` swallowed all errors → empty defaults**; its only consumer `useAdminDashboardPresenter` had zero call sites (the live dashboard uses `useAnalyticsDashboard`). **RESOLVED: both deleted.** | Medium (observability) | `frontend/src/services/admin/admin.service.ts`, `frontend/src/hooks/presenters/useAdminDashboardPresenter.ts` |
| 2.3 | ~~Mock mode points at a server that doesn't exist~~ **RESOLVED 2026-07-31**: mock server was already deleted; removed the vestigial `IS_MOCK` branch (BASE_URL now plain `NEXT_PUBLIC_GATEWAY_URL || http://localhost:8787`) and the `NEXT_PUBLIC_API_MOCK` line from `.env.example`. | Low | `frontend/src/lib/api/apiClient.ts:17-21` |
| 2.4 | ~~`getAccessToken` scans `localStorage` for keys with a hardcoded `sb-` prefix (not keyed to the project ref) — with multiple Supabase projects on one origin it can read the wrong session's token~~ **RESOLVED 2026-07-31**: prefix now derived from `NEXT_PUBLIC_SUPABASE_URL` project ref (`sb-{ref}-`), falls back to `sb-` only when the URL is unparsable. | Low | `frontend/src/lib/api/apiClient.ts` |
| 2.5 | ~~Gateway mutation gate dead code~~ **RESOLVED 2026-07-31**: `isCliAdmin` was derived from `authCtx.role` (null whenever `authCtx` is null), so `!authCtx && !isCliAdmin` ≡ `!authCtx`; removed the dead condition and its misleading comment (index.ts). No bypass exists. | Low | `workers/unified-gateway/src/index.ts:223-225` |
| 2.6 | Verified sound: JWT validation via JWKS (`validateJWT`, 401 + `UNAUTHORIZED` envelope), 10s token-expiry skew, `_pendingToken` refresh dedupe, unauthenticated mutations rejected with 401, downstream `x-user-*` headers stripped from client-controlled input. | — | `workers/unified-gateway/src/index.ts`, `frontend/src/lib/api/apiClient.ts` |

## 3. Dependency audit

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 3.1 | **`npm audit` (root): 9 high / 0 critical** — all in the ESLint dev chain. **PARTIALLY RESOLVED 2026-07-31**: the report's "eslint 8.x" claim was stale — the lockfile already runs eslint 9.39.5. The remaining 9 high are `brace-expansion` 1.1.18 (GHSA-mh99-v99m-4gvg, DoS) nested under minimatch 3.1.5, which **eslint 9 core hard-pins** (`minimatch@^3.1.2`) — no patched version exists upstream. `brace-expansion` override (5.0.8) applied to the minimatch 10.x paths (typescript-eslint/ts-morph → now 5.0.9). Exposure: zero — the repo's `lint` script is `echo Lint ok` (eslint never executes). Revisit when eslint upstream drops the minimatch 3.x pin. | Low (dev-only, inert) | `D:\Light-Story\package-lock.json` |
| 3.2 | Only **one lockfile exists** (root) — `workers/unified-gateway` and `packages/*` are covered by the root lock; no orphaned per-package manifests. Workers previously audited at 0. | — | repo root |
| 3.3 | No `npm audit` findings for the 5 runtime deps of the worker (itty-router, zod, jose, @supabase/postgrest-js, miniflare-dev). | — | `workers/unified-gateway/package.json` |

## 4. Secrets & repo hygiene

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 4.1 | ~~`frontend/scripts/import_root_env.mjs` copies missing keys from root `.env` into `frontend/.env.local`~~ **RESOLVED 2026-07-31**: script no longer exists (verified — no references anywhere); report row was stale. | Low | (deleted) |
| 4.2 | Supabase anon key is embedded in the frontend build (expected for Supabase); the **service key lives only in gateway env** (correct). `SUPABASE_SERVICE_KEY` absence → explicit `NOT_CONFIGURED` 500, never falls back to anon. | — (OK) | `workers/unified-gateway/src/routes/admin.ts:290` |
| 4.3 | ~~bookmarks/history/sync state in localStorage (`reader:bookmarks`, `reader:history`) with silent server-fallback — consistent XSS surface with 1.2~~ **RETRACTED 2026-07-31** (same evidence class as 1.2): stores only comic/chapter IDs + timestamps — no secrets, no content, same-origin admin/reader data; server response takes precedence when reachable (`readerHub.service.ts:45-48,64-73`), local copy is a deliberate offline/instant-UI mirror. Residual functional note (not security): a bookmark toggled while offline stays local-only until a successful sync. | — (OK) | `frontend/src/services/reader/readerHub.service.ts` |
| 4.4 | `productionBrowserSourceMaps: false` and `removeConsole` (except `error`) in prod — good. CSP is present in `next.config.js` (see 5.6). | — (OK) | `frontend/next.config.js` |

## 5. API consistency (frontend ↔ gateway ↔ DB)

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 5.1 | **`/api` prefix mismatch is NOT a bug** — resolved: gateway strips the prefix (`stripApiPrefix`, index.ts:219) and dispatches `/stories`·`/chapters`·`/categories` (285-289), `/comics`, `/media/`, `/admin`, and proxies `/api/supabase/(rest\|auth\|storage)/v...` and `/rpc/` (index.ts:241-246, cors.ts:50-52). Frontend tests lock the `/api/...` contract (comic.service.test.ts:141). | — (OK) | `workers/unified-gateway/src/index.ts:219` |
| 5.2 | **Inconsistent list-response shapes**: `GET /comics` → raw array (`handleRes`), `GET /stories` → `{items, total}`. Same resource type, two envelopes. **RESOLVED 2026-07-31: `/comics` now returns `{items, total}`** (mirrors stories.ts; all frontend consumers already tolerated the envelope). | Medium | `comics.ts` vs `stories.ts` |
| 5.3 | Param surface divergence: `/stories` supports `sort` + `status=in.(...)`; `/comics` supported neither `sort` nor `limit` — HomePage's `sort=most_viewed` and Header's `limit=6` were silently ignored (returned 10 newest). **RESOLVED 2026-07-31: `/comics` accepts `sort` (newest/popular/most_viewed/alphabet/newest_update) + `limit`; count query mirrors filters.** | Medium | `comics.ts:35-52`, `stories.ts` |
| 5.4 | `site_settings` GET/POST shapes are consistent on both sides: GET `?keys=`/`scope=admin\|public` (public scope intentionally bypasses the admin role check), POST accepts `{payload:[...]}` **or** `{key,value}` — both frontend shapes covered. Admin GET also returns `[]` on Supabase 5xx (dev-tolerance `ponytail:` comment) — production hides outages (ties to 2.2). | Low | `workers/unified-gateway/src/routes/admin.ts:269-328` |
| 5.5 | Analytics RPCs called by the frontend all exist in migrations with `authenticated` grants: `get_user_engagement_summary`, `get_signup_trend`, `get_top_chapters_by_reads` (+ favorite_count variant), `get_total_views`, `get_total_favorites`. | — (OK) | `supabase/migrations/*` |
| 5.6 | ~~CSP `img-src` gap — CONFIRMED, breaks prod only~~ **RESOLVED 2026-07-31 (verified)**: gateway worker domain (via `NEXT_PUBLIC_GATEWAY_URL_PRODUCTION` interpolation) + `https://*.supabase.co` were already added to `img-src` in the **working tree** (uncommitted change in `next.config.js`; committed HEAD still lacks them — prod build from HEAD would break images). Fix verified present; lands with the next commit. | **High** → fixed | `frontend/next.config.js:42` |
| 5.7 | ~~CORS: `corsHeaders` returns `*` with `Allow-Credentials: true` (browsers reject the combination)~~ **RESOLVED 2026-07-31**: `Allow-Credentials` now `false` whenever the origin is not allowlisted (`allowed !== '*'`); allowlisted origins still get `true`. `isOriginAllowed` continues to gate non-OPTIONS requests. | Medium | `workers/unified-gateway/src/middleware/cors.ts` |
| 5.8 | Rate limiting is **per-isolate in-memory** (`checkRateLimit(request, isAuthOrAdmin, userRole, pathname)`) — resets on every worker instance; `isAuthOrAdmin`/role get different limits (not a bypass, but multi-isolate rollover weakens it). 429 envelope + `Retry-After` are correct. | Low | `workers/unified-gateway/src/index.ts:199` |

---

## Priority order

1. **5.6 CSP img-src** — story covers are broken in prod as configured; likely chapter images too. Add gateway domain + `*.supabase.co` to `img-src` (or serve media same-origin). **FIXED in working tree 2026-07-31** (next.config.js:42 — fix uncommitted; must land with the next commit, otherwise prod build from HEAD still lacks it).
2. **1.1 Chapter image overwrite / delete without staff check** — ~~add `requireRole` gate; confirm RLS covers both paths~~ **RETRACTED 2026-07-31**: the global `requireRole(['superadmin','admin','employee'])` gate at admin.ts:85 covers every `/admin/*` route; audit/site-settings/r2 gates verified (superadmin :90, admin :96, admin :772). RLS remains defense-in-depth.
3. **2.1 / 2.2** — ~~wire or remove `logDashboardAccess`; surface dashboard fetch errors~~ **RESOLVED 2026-07-31: all three were dead code with zero call sites — deleted** (`logDashboardAccess`, `getDashboardData`, `useAdminDashboardPresenter`; live dashboard uses `useAnalyticsDashboard`).
4. **5.2 / 5.3** — unify list envelope; implement or drop `sort`/`limit` on `/comics`. **RESOLVED 2026-07-31** (`{items,total}` + `sort`/`limit` on `/comics`).
5. Cleanups: ~~1.4~~ (**done**: `sb` import removed), ~~2.5~~ (**done**: dead `isCliAdmin` removed 2026-07-31), ~~2.3~~ (**done**: vestigial mock mode removed 2026-07-31), ~~4.1~~ (**done**: script already deleted, report stale — verified 2026-07-31).
6. Dependency: 3.1 (9 high, dev-only, inert) — minimatch 10.x path fixed via `brace-expansion` override 2026-07-31; residual = eslint-core hard pin (upstream), revisit when they upgrade.
7. **Bonus fix 2026-07-31**: `npm run build` was **red** (pre-existing, unrelated): unused `ComicChapterFormValues` import in `comicCms.service.ts:4` broke Next's type-check step (vitest never caught it — esbuild doesn't typecheck). Removed; build + 139 tests green.
8. **2.4 / 5.7 / 1.2 / 4.3 / 5.6 2026-07-31**: localStorage auth-key prefix now derived from the Supabase project ref (2.4); CORS `Allow-Credentials` invalid `*`+true combo fixed (5.7); 1.2 retracted (gateway paging verified) + catalog fetch now passes `pageSize=100`; 4.3 retracted (IDs + timestamps only, same-origin); 5.6 fix (img-src) verified present in working tree, uncommitted. **Only remaining open item: 5.8** (per-isolate rate limiting — needs KV/DO shared state; accepted Low, revisit when traffic or abuse signal justifies it).

## Not audited (out of scope / no evidence)
- RLS policy files themselves (only their effects observed); rate-limit values; Cloudflare account config.
