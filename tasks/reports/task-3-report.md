# Task 3 Report — API Routes Review (`frontend/src/app/api`)

- **Date**: 2026-08-08
- **Status**: DONE_WITH_CONCERNS
- **Scope**: 5 route handlers, auth/validation/error-handling consistency per PROJECT_RULES (I.7, I.8, I.9, I.10, II.1, III, IV)
- **Mode**: READ-ONLY — no fixes, no commits.
- **Findings**: 1 High, 5 Med, 4 Low

---

## 1. Per-route table

| Route | Method(s) | Purpose | Auth status | Validation status | Findings |
|---|---|---|---|---|---|
| `api/avatar/route.ts` | GET | Proxy Supabase Storage avatars w/ immutable cache headers | None — public by design (avatar images) | Manual (URL parse + hostname/path allowlist); no Zod | F-02 (Low, I.7), F-03 (Low, IV), F-04 (Med, IV) |
| `api/health/route.ts` | GET | Liveness/readiness probe + DB connectivity check | None — correct for probes | N/A | — (clean) |
| `api/r2/proxy/route.ts` | GET | Proxy R2 objects (chapters/covers/avatars) w/ cache headers | None — public by design for covers/avatars; **concern for `chapters`** | Manual (key/folder checks); no Zod | F-05 (Med, IV), F-06 (Low, I.7), F-07 (Low, IV) |
| `api/r2/upload/route.ts` | POST | Multipart upload of images/.cbz/.zip to R2 | **RBAC via `requireRouteAuthorization`**, roles `ACTION_ADMIN_ROLES` (superadmin/admin/employee/internal), role from `app_metadata.role` — compliant with I.8 | Manual (folder/type/ext/size checks); no Zod (multipart, see F-08) | F-08 (Low, I.7), F-09 (Med, IV) |
| `api/webhooks/supabase/route.ts` | POST | Receive Supabase DB/auth webhook events | **HMAC-SHA256 signature** (`x-supabase-signature`), `timingSafeEqual` — compliant with II.1; dev bypass is explicit | **Zod** `supabaseWebhookSchema` (`lib/schemas/webhook.ts`) — compliant with I.7 | F-10 (Low, II.1) |

### Verification summary

| Rule | Check | Result |
|---|---|---|
| I.7 | Zod validation from `lib/schemas/` | Only webhook route uses Zod; 3 routes use manual validation (see F-02/F-06/F-08) |
| I.8 | Auth/role on sensitive routes | `r2/upload` ✓ (app_metadata role); `r2/proxy` chapters unauthenticated (F-05) |
| I.9 | `revalidateTag(` has 2 params | **PASS** — 73/73 calls have 2 args (grep evidence below) |
| I.10 | No `'use server'` in route handlers | **PASS** — 0 matches in `src/app/api` |
| II.1 | Webhook signature verified | ✓ (F-10 dev-mode caveat) |
| III | No client `fetch` to internal `/api/` | **2 violations** — Header.tsx:92, TranslatorManagementTab.tsx:73 (F-01a/F-01b) |
| IV | R2 assets protected | Partial — upload ✓ RBAC; proxy unauthenticated (F-05, F-07) |

---

## 2. Findings

### F-01a — `src/components/navigation/Header.tsx:92` — Med — III
`apiClient.get(`/api/comics?keyword=...`)` — client-side fetch to an internal `/api/` path. **The route does not exist** (`src/app/api/` contains only the 5 audited routes), so this is a dead endpoint: always 404, search always empty. Leftover from a removed route.
*Evidence:* `src/components/navigation/Header.tsx:92: const res = await apiClient.get<any>(`/api/comics?keyword=${encodeURIComponent(trimmed)}&limit=6`).catch(() => null);`

### F-01b — `src/components/admin/comics/TranslatorManagementTab.tsx:73` — Med — III
`apiClient.get("/api/admin/translators")` — client-side fetch to an internal `/api/` path. **Route does not exist** — dead endpoint (silently 404s, `.catch(() => null)`). Also bypasses the existing `translators.actions` server actions used elsewhere in the same file.
*Evidence:* `src/components/admin/comics/TranslatorManagementTab.tsx:73: const res = await apiClient.get<TranslatorApiRow[]>("/api/admin/translators");`

### F-02 — `src/app/api/avatar/route.ts` (validation block, lines 10–30) — Low — I.7
Input validated manually (URL parse + `hostname.endsWith('.supabase.co')` + path prefix) instead of a Zod schema from `lib/schemas/`. Single query param makes Zod marginal, but it breaks the I.7 consistency rule. The allowlist itself is sound (rejects `supabase.co.evil.com`, userinfo tricks, non-`/storage/v1/object/public/avatars/` paths).

### F-03 — `src/app/api/avatar/route.ts:33` — Low — IV
`fetch(parsedUrl.toString())` follows redirects by default with no `redirect: 'manual'` check — the SSRF allowlist validates only the *initial* URL. If a Supabase storage URL ever 307/308s to an arbitrary host, the server would fetch and relay it. Defense-in-depth: `response.redirected` check or `redirect: 'manual'` + explicit handling.

### F-04 — `src/app/api/avatar/route.ts:46` — Med — IV
Entire upstream body buffered into memory (`response.arrayBuffer()`) with **no size cap** and no rate limiting on a public, unauthenticated endpoint. A large storage object (or repeated requests) exhausts server memory — unauthenticated memory-exhaustion vector.

### F-05 — `src/app/api/r2/proxy/route.ts` (whole handler) — Med — IV
`GET /api/r2/proxy` serves the **`chapters`** folder **unauthenticated** (public, immutable 1-year cache). Upload-side RBAC is tight (F-08 route) but any user — logged out included — can pull chapter images. If `chapters` holds premium/paid content this is a content-leak; covers/avatars are public by design. Route has no `requireRouteAuthorization`, no signed URLs, no R2 bucket-level ACL. (Design decision, but must be consciously accepted.)

### F-06 — `src/app/api/r2/proxy/route.ts` (lines 26–42) — Low — I.7
Query params (`key`, `folder`) validated manually (traversal block + folder allowlist) instead of Zod. The manual checks are solid: `..`, `\`, leading `/` blocked; `searchParams` already decodes `%2e%2e` so encoding bypasses are covered.

### F-07 — `src/app/api/r2/proxy/route.ts:56` — Low — IV
`Buffer.from(body)` materializes the full object in memory with no object-size guard (key allows arbitrary object names). Images are typically small; a large object via a crafted key is a memory-pressure vector. Low (R2 key must exist and be valid), but cheap to guard.

### F-08 — `src/app/api/r2/upload/route.ts` (lines 40–66) — Low — I.7
Manual multipart validation instead of Zod. Reasonable for `FormData` (Zod `z.formData()` could cover folder; file checks stay manual). Two soft gaps:
- `application/octet-stream` is in `ALLOWED_TYPES` and accepted for *any* non-cbz/zip upload (line 55–57), so the MIME check is bypassable for arbitrary binary; the extension allowlist (line 58) is the effective guard. OK in practice, weak layering.
- No extension↔MIME cross-check (e.g. `.png` with `text/html` passes type check since `text/html` is rejected… actually rejected — only allowlist members pass; cross-check would only tighten cbz/zip spoofing).

### F-09 — `src/app/api/r2/upload/route.ts:77` — Med — IV
`new Uint8Array(await file.arrayBuffer())` buffers the **entire file in memory up to the 250MB cap**. Concurrent uploads → N×250MB memory spike on the server. Mitigation: stream to R2 (multipart/streaming put) or lower cap. (Upload is RBAC-gated, so only trusted roles can trigger — mitigates but does not remove.)

### F-10 — `src/app/api/webhooks/supabase/route.ts:44–52` — Low — II.1
Signature verification is **skipped entirely when `SUPABASE_WEBHOOK_SECRET` is unset in non-production** (anyone can POST valid-shaped JSON and get `received: true`). Intentional dev convenience and production is protected (500 when unset in prod), but the unauthenticated dev path silently eats events a dev may mistake for real deliveries. Also: on signature failure the route returns 401 without logging the payload — fine (no PII), no change needed. HMAC + `timingSafeEqual` + length check are correct.

---

## 3. Grep evidence

### 3.1 `revalidateTag(` — I.9 (2-arg check) — **PASS, 0 violations**
73 matches across `src/lib/actions/*.actions.ts` and `src/actions/*.actions.ts`; every call passes the tag + `'max'` (e.g. `revalidateTag(CACHE_TAGS.COMICS, 'max')`, `revalidateTag('taxonomy', 'max')`). No 1-arg calls found.

### 3.2 `'use server'` in route handlers — I.10 — **PASS, 0 matches**
`grep "use server"` in `src/app/api` → no results. No directive misuse.

### 3.3 Client `fetch(` to internal `/api/` — III — **2 violations (F-01a/F-01b)**
- `fetch(` in `src/app` (1 match): `src/app/api/avatar/route.ts:33` — **server-side upstream fetch** (R2/Supabase proxy), not a violation.
- `fetch(` in `src/components` (3 matches): all `react-query` `.refetch()` calls (StoryManagementTab.tsx:168, AnalyticsDashboardTab.tsx:275, DashboardAccessLogsTab.tsx:69) — not violations.
- `/api/` string sweep (`['"`]\/api\/`) in `src/app` + `src/components`:
  - `src/app/robots.ts:14` — `disallow: [..., '/api/']` — robots.txt policy, not a violation.
  - `src/components/navigation/Header.tsx:92` — `apiClient.get(\`/api/comics?keyword=...\`)` → **F-01a**
  - `src/components/admin/comics/TranslatorManagementTab.tsx:73` — `apiClient.get("/api/admin/translators")` → **F-01b**

### 3.4 Route inventory
`glob src/app/api/**/route.ts` → exactly the 5 audited routes; no other internal API routes exist. Therefore both client fetches in 3.3 are confirmed dead endpoints.

---

## 4. Context notes (not findings)

- **Auth pattern consistency**: `lib/security/route-auth.ts` resolves role exclusively from `app_metadata.role` (synced by DB trigger `app_private.sync_profile_role_to_auth`) — matches I.8 preferred source; `permission.ts` uses the same source for server actions. `r2/upload` is the only audited route wired to it; `avatar`, `health`, `r2/proxy`, `webhooks` are intentionally unauthenticated (public assets / probe / signature auth).
- `health/route.ts` returns 503 when DB unreachable (good), treats "unconfigured" as healthy (acceptable for build/test); uses service-role key when present — no finding.
- `Header.tsx` uses client-only hooks/contexts (`useAuth`, `useEffect`, `useRouter`) but has **no `"use client"` directive** (translator tab does). Either a latent build error or a module-boundary accident; tangential to this task, noted for awareness. (Low, unassigned.)

## 5. Verification

- [x] Report file contains all findings; no fixes applied; no commits made.
