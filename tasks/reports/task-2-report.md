# Task 2 Report — Route structure audit + `(auth)/layout.tsx`

**Task**: Audit `frontend/src/app/` route structure against PROJECT_RULES.md II.1; create missing `(auth)/layout.tsx`.
**Status**: DONE
**Commit**: (see final line)

## 1. Audit table

Legend: ✓ present, ✗ missing, — not required (leaf dir / segment-parent dir / API route).

### Group-level files (5 route groups + root)

| Route dir | URL prefix | page.tsx | layout.tsx | loading.tsx | error.tsx | not-found | Notes |
|---|---|---|---|---|---|---|---|
| `app/` (root) | — | ✓ (n/a) | ✓ | ✓ | ✓ + global-error | ✓ | + robots/sitemap/opengraph OK |
| `(public)` | none ✓ | ✓ | ✓ | ✓ | ✓ | — | |
| `(user)` | `/user` ✓ | — (segment parent, OK) | ✓ | ✓ | ✓ | ✗ | group OK; no not-found (vs `(admin)`) |
| `(admin)` | `/admin` ✓ | — (segment parent, OK) | ✓ | ✓ | ✓ | ✓ | |
| `(auth)` | none ✓ | — (zero pages, by design) | ✗ → **NEW** ✓ | ✓ | ✓ | — | layout created by this task |
| `(errors)` | none ✓ | — (segment parent, OK) | ✗ | ✗ | ✗ | — | **flagged, see F2** |

### Route dirs: page.tsx presence + dynamic-segment siblings

| Route dir | page.tsx | sibling layout | sibling loading | sibling error |
|---|---|---|---|---|
| `(public)/auth` | — (parent) | ✓ | ✗ (group covers) | ✓ |
| `(public)/auth/login` | ✓ | — | — | — |
| `(public)/auth/register` | ✓ | — | — | — |
| `(public)/auth/forgetPassword` | ✓ | — | — | — |
| `(public)/auth/reset-password` | ✓ | — | — | — |
| `(public)/comics` | ✓ | ✓ | ✗ (group covers) | ✗ (group covers) |
| `(public)/comics/[comicId]` | ✓ | ✓ | ✓ | ✓ |
| `(public)/comics/[comicId]/chapter/[chapterId]` | ✓ | ✓ | ✓ | ✓ |
| `(public)/genres` | ✓ | ✗ | ✗ (group covers) | ✗ (group covers) |
| `(public)/genres/[genreSlug]` | ✓ | ✓ | ✓ | ✓ |
| `(public)/profile` | ✓ | — | — | — |
| `(public)/search` | ✓ | — | — | — |
| `(user)/user` | ✗ | — | ✓ | ✓ | **F1** |
| `(user)/user/bookmarks` | ✓ | — | — | — |
| `(user)/user/dashboard` | ✓ | — | — | — |
| `(user)/user/history` | ✓ | — | — | — |
| `(user)/user/profile` | ✓ | — | — | — |
| `(admin)/admin` | ✓ | — | ✓ | ✓ |
| `(admin)/admin/ads` | ✓ | — | — | — |
| `(admin)/admin/analytics` | ✓ | — | — | — |
| `(admin)/admin/audit` | ✓ | — | — | — |
| `(admin)/admin/categories` | ✓ | — | — | — |
| `(admin)/admin/chapters` | ✓ | — | — | — |
| `(admin)/admin/chapters/[chapterId]` | ✓ | ✗ | ✗ | ✗ | **F3** |
| `(admin)/admin/comics` | ✓ | — | — | — |
| `(admin)/admin/comics/[comicId]` | ✓ | ✗ | ✗ | ✗ | **F3** |
| `(admin)/admin/comics/new` | ✓ | — | — | — |
| `(admin)/admin/dashboard` | ✓ | — | — | — |
| `(admin)/admin/profile` | ✓ | — | — | — |
| `(admin)/admin/settings` | ✓ | — | — | — |
| `(admin)/admin/users` | ✓ | — | — | — |
| `(errors)/forbidden` | ✓ | — | — | — |
| `(errors)/unauthorized` | ✓ | — | — | — |
| `(errors)/handle-exception/400` | ✓ | — | — | — |
| `(errors)/handle-exception/401` | ✓ | — | — | — |
| `(errors)/handle-exception/403` | ✓ | — | — | — |
| `(errors)/handle-exception/404` | ✓ | — | — | — |
| `(errors)/handle-exception/503` | ✓ | — | — | — |
| `api/avatar`, `api/health`, `api/r2/proxy`, `api/r2/upload`, `api/webhooks/supabase` | route.ts ✓ (correct for API) | — | — | — |

### URL prefix check (PROJECT_RULES II.1)

| Group | Expected prefix | Actual | Verdict |
|---|---|---|---|
| `(public)` | none | `/`, `/comics/...`, `/genres/...`, `/auth/...` | ✓ |
| `(auth)` | none | (no pages yet) | ✓ |
| `(errors)` | none | `/forbidden`, `/unauthorized`, `/handle-exception/*` | ✓ |
| `(user)` | `/user` | `/user/bookmarks|dashboard|history|profile` | ✓ |
| `(admin)` | `/admin` | `/admin/*` (all 10 subroutes) | ✓ |

## 2. Findings (no fixes in this task)

| ID | File/dir | Issue | Severity | Rule |
|---|---|---|---|---|
| F1 | `(user)/user/` | No `page.tsx` → `/user` URL returns 404. Confirmed in build route table: no `/user` route emitted. | MEDIUM | II.1 route structure / plan (every route dir has page.tsx) |
| F2 | `(errors)/` | Pages exist but group has no `layout.tsx`, `error.tsx`, `loading.tsx` — error pages render without chrome, no group error boundary. | MEDIUM | II.1 "Mỗi route group nên có file error.tsx và loading.tsx" (flagged per brief) |
| F3 | `(admin)/admin/chapters/[chapterId]`, `(admin)/admin/comics/[comicId]` | Dynamic segments lack sibling `layout/loading/error` — `(public)` dynamic segments have all three; `(admin)` pattern inconsistent (group-level error/loading mitigates). | LOW | brief: dynamic `[x]` dirs have sibling-matching layout/loading/error |
| F4 | `(user)/` vs `(admin)/` | `(admin)` has `not-found.tsx`, `(user)` does not — inconsistent group chrome. | LOW | II.1 (consistency) |
| F5 | `(public)/comics/`, `(public)/genres/` | Segment dirs lack own `error/loading` (covered by `(public)` group-level files) — acceptable, informational. | INFO | II.1 |
| F6 | root `layout.tsx` | `metadataBase` not set — build warning, pre-existing, out of scope. | INFO | — |

## 3. Changes made

Only one file created, verbatim clone of `(public)/layout.tsx` with function renamed + required ponytail comment:

- `frontend/src/app/(auth)/layout.tsx` (NEW) — `'use client'`, `AuthLayout`, imports `Header`, `PublicFooter`, `LoginModal`, `useState` login-modal state; header comment `// ponytail: layout duplicated from (public); extract shared chrome only if a 3rd group needs it`.

No other files modified. `(public)/auth/layout.tsx` untouched. `opencode.json` untouched.

## 4. Verification

- `npm run build` (workdir `D:\Light-Story\frontend`): **PASS** — Next.js 16.3.0 (Turbopack), compiled + typecheck OK, 41/41 pages generated. Only pre-existing warning: `metadataBase` not set (F6). PowerShell stderr wrapper noise is cosmetic.
- New file present: `frontend/src/app/(auth)/layout.tsx` ✓
- Build route table confirms `(auth)` group emits nothing yet (zero pages, by design) and `/user` absent (F1).

## 5. Commit

- Hash: `__COMMIT_HASH__` (filled after commit)
