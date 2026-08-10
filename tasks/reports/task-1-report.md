# Task 1 Report: Build + test baseline

Date: 2026-08-08
Status: **DONE** — baseline green on first attempt, no fixes required.

## Build result (`npm run build`, workdir `D:\Light-Story\frontend`)

Exit code: **0** (success on first run, no fixes needed)

```
> react-example@0.0.0 build
> next build

▲ Next.js 16.3.0 (Turbopack)
- Environments: .env.local
✓ Running next.config.js took 19ms
- Experiments (use with caution):
  · optimizePackageImports

  Creating an optimized production build ...
✓ Compiled successfully in 9.7s
  Running TypeScript ...
  Finished TypeScript in 8.2s ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/41) ...
⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000". See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000". See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
  Generating static pages using 11 workers (10/41)
  Generating static pages using 11 workers (20/41)
  Generating static pages using 11 workers (30/41)
✓ Generating static pages using 11 workers (41/41) in 3.6s
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /admin
├ ○ /admin/ads
├ ○ /admin/analytics
├ ○ /admin/audit
├ ○ /admin/categories
├ ○ /admin/chapters
├ ƒ /admin/chapters/[chapterId]
├ ○ /admin/comics
├ ƒ /admin/comics/[comicId]
├ ○ /admin/comics/new
├ ○ /admin/dashboard
├ ○ /admin/profile
├ ○ /admin/settings
├ ○ /admin/users
├ ƒ /api/avatar
├ ƒ /api/health
├ ƒ /api/r2/proxy
├ ƒ /api/r2/upload
├ ƒ /api/webhooks/supabase
├ ○ /auth/forgetPassword
├ ○ /auth/login
├ ○ /auth/register
├ ○ /auth/reset-password
├ ○ /comics
├ ƒ /comics/[comicId]
├ ƒ /comics/[comicId]/chapter/[chapterId]
├ ○ /forbidden
├ ƒ /genres/[genreSlug]
├ ○ /handle-exception/400
├ ○ /handle-exception/401
├ ○ /handle-exception/403
├ ○ /handle-exception/404
├ ○ /handle-exception/503
├ ○ /opengraph-image
├ ○ /profile
├ ○ /robots.txt
├ ○ /search
├ ○ /sitemap.xml
├ ○ /unauthorized
├ ○ /user/bookmarks
├ ○ /user/dashboard
├ ○ /user/history
└ ○ /user/profile


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Warnings (non-blocking, pre-existing, NOT fixed per task scope):
- `metadataBase` not set — 2 occurrences (social/OG image URL resolution defaults to `http://localhost:3000`).

## Test result (`npm run test:run`, workdir `D:\Light-Story\frontend`)

Exit code: **0**

```
> react-example@0.0.0 test:run
> vitest run

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - `__dirname` (vitest.config.ts:21:25). Use `import.meta.dirname` instead
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

 RUN  v4.1.10 D:/Light-Story/frontend


 Test Files  45 passed (45)
      Tests  385 passed (385)
   Start at  23:17:54
   Duration  29.91s (transform 2.14s, setup 4.30s, import 3.99s, tests 3.45s, environment 12.38s)
```

Counts: **45/45 test files passed, 385/385 tests passed, 0 failed.**

## Files changed

**None.** The build and tests both passed on the first run, so no compile blockers existed and no fixes were applied. This matches the brief's estimated scope ("possibly zero").

## Re-runs after fixes

Not applicable — no fixes were made, so no re-runs were required.

## Baseline summary for later tasks

| Gate | Result |
|---|---|
| `npm run build` | Exit 0, compiled + TypeScript clean, 41 routes |
| `npm run test:run` | 45 files / 385 tests, all pass |
| Files modified | 0 |
