# Task 10a Report — Fix Batch 4a: root error/SEO lows

Date: 2026-08-09 · Workdir: `D:\Light-Story\frontend` · Plan: frontend /src/app full sweep

## Findings fixed

### L3 + L4 — `src/app/not-found.tsx` (plain `<a>` + EN copy)
- **Before**: plain `<a href={ROUTES.HOME}>` ("Return Home"); EN copy ("Page Not Found", "The page you requested does not exist or may have been moved."); "Error 404" label.
- **After**: `next/link` `Link`; VI copy matching `error.tsx`/`global-error.tsx` style — label "Lỗi 404", h1 "Không Tìm Thấy Trang", body "Trang bạn yêu cầu không tồn tại hoặc có thể đã được di chuyển.", CTA "Trang Chủ". Server component, so `Link` is fine without `"use client"`.

### L5 — `src/app/robots.ts` (stale `/dashboard` disallow)
- **Before**: `disallow: [ROUTES.ADMIN.ROOT, ROUTES.USER.ROOT, '/dashboard', '/profile', '/api/']` — `/dashboard` route does not exist anywhere.
- **After**: removed `'/dashboard'`; kept `'/profile'` (route exists as public-by-design redirect — intentional, commented). `/api/`, admin/user roots unchanged. ROUTES constants used where they exist; `/profile` has no constant (public redirect, not `ROUTES.USER.PROFILE` = `/user/profile`).

### L7 — `src/app/globals.css:8` (dead `--color-primary`)
- **Before**: `@theme { --color-primary: #6366f1; ... }` at line 8.
- **After**: line deleted. Confirmed shadowed by later `@theme inline` block (`--color-primary: var(--primary)` at line 130). No token loss.

### F12 — `src/components/errors/StatusErrorPage.tsx:30` (`<a>` → Link)
- **Before**: `<a href={actionHref}>` back-home button (component used by `(errors)` group pages → full page reload).
- **After**: `next/link` `Link` (client component; `actionHref` default `'/'` unchanged).

### Batch-3 reviewer minor — `src/app/api/avatar/route.ts:60` (upstream 3xx)
- **Before**: with `redirect: 'manual'`, a 3xx upstream passed `response.redirected`/`opaqueredirect` checks in some cases and fell to `!response.ok` → returned JSON body carrying a **3xx status**.
- **After**: explicit `response.status >= 300 && < 400` guard → logged + `502 { error: 'Upstream redirect not allowed' }`. 400/403/404/5xx paths unchanged (still passed through `!response.ok`).

## Accepted notes (no code change)

- **L1** (`src/app/error.tsx` hardcoded VI): site default language IS VI — consistent by design. i18n migration out of scope for this sweep.
- **L2** (`lang="vi"` vs `en`): per plan controller, stays as accepted note; do not touch (root `layout.tsx` owns language metadata).
- **L8** (destructive == accent/muted purple): design decision on the shared token; accepted note, no change.

## Verification

### Build — PASS
```
> next build (Next.js 16.3.0, Turbopack)
✓ Compiled successfully in 3.6s
  Running TypeScript ... Finished in 4.5s
✓ Generating static pages (42/42)
```
Routes confirmed: `/robots.txt`, `/profile`, `/_not-found`, `/api/avatar` all present. `/dashboard` absent (validates L5 removal).

### Tests — PASS
```
Test Files  45 passed (45)
     Tests  385 passed (385)
```
Pre-existing non-blocking warning only: `__dirname` in `vitest.config.ts:21` (native config loader deprecation).

## Commit

- Message: `fix(app): root error/SEO lows — VI not-found + Link, robots cleanup, dead token, avatar 3xx (task 10a)`
- Hash: see `git log` after push (reported in final message).

## Concerns
- None blocking. `/profile` disallow retained intentionally per acceptance criteria.
