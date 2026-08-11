# Task 8b Report — Fix Batch 1b (root files + env docs)

- **Status**: DONE
- **Commit**: `dfdfb67` (`fix(app): guard metadataBase, error message, sitemap URL; style global-error`)
- **Build**: `npm run build` — passed (Next.js 16.3.0, 41/41 static pages, TypeScript clean)
- **Tests**: `npm run test:run` — 45 files / 385 tests passed
- **Lint**: pre-commit hook `npm run lint` — "Lint ok"

## Per-finding before/after

### M5 — `src/app/layout.tsx:9,12` — metadataBase conditional on undocumented env

**Before**: `...(siteUrl ? { metadataBase: new URL(siteUrl) } : {})` — when `NEXT_PUBLIC_SITE_URL` unset, `metadataBase` absent → OG falls back to localhost in production. `NEXT_PUBLIC_SITE_URL` not documented anywhere.

**After**: `metadataBase` set unconditionally via `resolveMetadataBase()`:
- dev (`NODE_ENV !== "production"`): `new URL("http://localhost:3000")`
- production: `NEXT_PUBLIC_SITE_URL` → else `NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN` → else `NEXT_PUBLIC_GATEWAY_URL_PRODUCTION` (protocol-normalized, `https://` prepended if missing) → else `throw new Error(...)` (fail loud, never emit localhost/placeholder in prod).
- `.env.example`: added documented `NEXT_PUBLIC_SITE_URL=` under the API Gateway section.

Note: `next build` runs with `NODE_ENV=production`; local `.env.local` has `NEXT_PUBLIC_GATEWAY_URL_PRODUCTION` set, so the fallback chain resolved at build and the sitemap/OG base is the gateway URL. Once `NEXT_PUBLIC_SITE_URL` is set in deploy envs, it takes precedence.

### M6 — `src/app/error.tsx:32` — raw `error.message` rendered

**Before**: `{error.message || "Vui lòng thử lại sau."}` — raw error message shown to users in production.

**After**: guards like `ErrorBoundary.tsx:44` — `const isDevelopment = process.env.NODE_ENV !== "production";` then `{isDevelopment && error.message ? error.message : "Vui lòng thử lại sau."}`. Production shows generic text only; dev still gets the real message.

### M7 — `src/app/global-error.tsx:19` — unstyled in production

**Before**: Tailwind classes used but `./globals.css` never imported → unstyled UI when global-error renders in production.

**After**: `import "./globals.css";` added.

### M8 — `src/app/sitemap.ts:5-15` — literal "undefined" URLs + auth pages

**Before**: `BASE_URL = NEXT_PUBLIC_SITE_URL || NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN` concatenated directly into 4 static entries + comic routes → literal `"undefined/..."` URLs if both unset. Auth pages `/auth/login`, `/auth/register` included (L6).

**After**: early-return guard mirroring robots.ts behavior — if `!BASE_URL`, `console.warn(...)` + return `[]`. Static entries reduced to `/` and `/comics` (auth pages dropped per L6 — no SEO value). Comic route generation unchanged.

## Files changed
- `frontend/src/app/layout.tsx` (+19)
- `frontend/src/app/error.tsx` (+3/-1)
- `frontend/src/app/global-error.tsx` (+1)
- `frontend/src/app/sitemap.ts` (+7/-4)
- `frontend/.env.example` (+2)

## Test output
```
Test Files  45 passed (45)
     Tests  385 passed (385)
   Duration  30.46s
```

## Verification checklist
- [x] Build + tests pass
- [x] Report per-finding before/after + test output
- [x] Commit (conventional) — `dfdfb67`

## Concerns
- None blocking. Note: `metadataBase` at build time currently resolves to `NEXT_PUBLIC_GATEWAY_URL_PRODUCTION` (`kv-worker.hhhuygiau.workers.dev`) until `NEXT_PUBLIC_SITE_URL` is set in deploy envs — expected per the brief's fallback chain.
- Unrelated working-tree changes (`opencode.json`, `tasks/reports/task-2-report.md`, untracked task briefs) were left untouched/unstaged.
