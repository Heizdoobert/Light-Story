# Task 4 Report — Root files review (`frontend/src/app/`)

- **Date:** 2026-08-08
- **Scope:** 10 root files of `src/app/` (report-only, zero code changes)
- **Reviewed against:** Task 4 brief + plan rule IDs (I.1 static-metadata/use-client, I.5 `@/` aliases, III server-client import leaks), plus domain rules META/SEO/ENV/SEC/I18N/CSS/UX.
- **Files read for dependency judgement:** `src/context/AuthContext.tsx`, `src/context/ThemeContext.tsx`, `src/context/LanguageContext.tsx`, `src/hooks/common/useGlobalErrorHandler.ts`, `src/components/errors/ErrorBoundary.tsx`, `src/components/shared/ads/AdZoneColumns.tsx`, `src/lib/constants/routes.ts`, `tsconfig.json`, `package.json`, `.env.example`/`.env.local` (key presence only, values redacted). Next.js 16.3 docs consulted for `global-error` CSS behavior and `error.message` production behavior.

## Verdict table

| # | File | Verdict | Key findings |
|---|------|---------|--------------|
| 1 | `layout.tsx` | PASS w/ finding | `metadataBase` conditional on undocumented env var (M1) |
| 2 | `loading.tsx` | PASS | Clean server component, `@/` alias, no issues |
| 3 | `error.tsx` | REVIEW | Raw `error.message` shown to users (M2); hardcoded VI (L1) |
| 4 | `global-error.tsx` | REVIEW | No global styles by design (M3); `lang="vi"` (L2); hardcoded VI (L1) |
| 5 | `not-found.tsx` | PASS w/ findings | `<a>` instead of `next/link` (L3); hardcoded EN vs VI error pages (L4) |
| 6 | `providers.tsx` | PASS | Provider order correct per actual deps |
| 7 | `robots.ts` | PASS w/ finding | Hardcoded/stale disallow paths (L5) |
| 8 | `sitemap.ts` | REVIEW | Unguarded `BASE_URL` → literal "undefined" URLs (M4); auth pages in sitemap (L6) |
| 9 | `opengraph-image.tsx` | PASS | `runtime='nodejs'` + comment correct for Next 16; alt/size/contentType exported |
| 10 | `globals.css` | PASS w/ findings | Dead duplicate `--color-primary` (L7); destructive==accent, purple muted (L8) |

## Findings (severity × rule ID)

### High — none

### Med

**M1 · META-1 · `layout.tsx:9,12` — `metadataBase` conditional on env var that is never documented/set**
```ts
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
...
...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
```
Code pattern is correct (guarded), but `NEXT_PUBLIC_SITE_URL` is **absent from `.env.example` and `.env.local`** (verified; `.env.example:11` only defines `NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN`, empty). Result: `metadataBase` is never emitted → Next build warns twice and OG/social URLs fall back to `localhost:3000`. Fix: set `metadataBase` unconditionally (hardcoded prod default or required env), and add `NEXT_PUBLIC_SITE_URL` to `.env.example` so the contract is documented. Same root cause also affects M4.

**M2 · SEC-1 · `error.tsx:32` — raw `error.message` rendered to end users**
```tsx
{error.message || "Vui lòng thử lại sau."}
```
Next 16 docs: in production, errors forwarded from **client components** retain the original `message` (only server-component errors are redacted by Next). Displaying it unconditionally can leak internal details; the codebase already solved this in `components/errors/ErrorBoundary.tsx:44` (`isDevelopment && this.state.error?.message ? ... : 'An unexpected runtime error occurred...'`) — root `error.tsx` should follow the same guard.

**M3 · CSS-1 · `global-error.tsx:19` — relies on Tailwind utilities + `.dark` class that never load**
```tsx
<body className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
```
Next 16 docs (error.js convention): "`global-error` and the built-in 500 page render their own document and do **not** include your global styles, so an app-level theme toggle (a class or `data-theme` attribute) won't reach them." `globals.css` is imported only by `layout.tsx`, which `global-error` replaces → error UI renders unstyled in production (no bg, no dark scheme). Fix: import `globals.css` inside `global-error.tsx` or inline styles.

**M4 · SEO-1 · `sitemap.ts:5-15` — unguarded `BASE_URL` produces literal "undefined" URLs**
```ts
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN;
...
{ url: `${BASE_URL}`, ... }
```
Both fallback vars are unset in the current environment, and — unlike `layout.tsx:12` and `robots.ts:17`, which guard with ternaries/`...(... ? {} : {})` — `sitemap.ts` interpolates unconditionally, emitting `"undefined"`, `"undefined/comics"`, etc. `/sitemap.xml` output is invalid until one of the two vars is set (and nothing documents that requirement). Fix: guard/`throw` when `BASE_URL` missing, or mirror robots.ts fallback.

### Low

**L1 · I18N-1 · `error.tsx:29-32`, `global-error.tsx:30-34` — hardcoded Vietnamese strings bypass the i18n system**
`LanguageProvider` (default `VI`, supports `EN`) is available to `error.tsx` (rendered inside root layout's `Providers`) yet text is hardcoded; `global-error.tsx` cannot use providers but could hardcode EN to match the rest. Site UI language flips to Vietnamese in error states regardless of user setting.

**L2 · I18N-2 · `global-error.tsx:18` — `<html lang="vi">` conflicts with root `<html lang="en">` (`layout.tsx:45`)**
Document `lang` attribute changes when a global error fires, misleading screen readers/translators. Root error.tsx path keeps `lang="en"` while showing Vietnamese text (same class of mismatch).

**L3 · UX-1 · `not-found.tsx:13` — plain `<a href={ROUTES.HOME}>` instead of `next/link`**
`not-found.tsx` is a server component; `Link` works and gives client-side navigation. `<a>` triggers a full page reload.

**L4 · I18N-1 · `not-found.tsx:8-11` — hardcoded English while sibling error pages are hardcoded Vietnamese**
```
Error 404 / Page Not Found / The page you requested does not exist...
```
vs. `error.tsx` "Đã Xảy Ra Lỗi Hệ Thống". Three root error surfaces use two languages with no source of truth.

**L5 · SEO-2 · `robots.ts:14` — disallow paths partially hardcoded, one stale**
```ts
disallow: [ROUTES.ADMIN.ROOT, ROUTES.USER.ROOT, '/dashboard', '/profile', '/api/'],
```
`/dashboard` matches no existing route (dashboards live at `/admin/dashboard`, `/user/dashboard`); `/profile` duplicates a public route (`(public)/profile`) that is being intentionally blocked — both should come from `ROUTES` (`ROUTES.USER.PROFILE`/`DASHBOARD` exist but are `/user/*` paths, so no constant exists for these two).

**L6 · SEO-3 · `sitemap.ts:13-14` — auth pages (`/auth/login`, `/auth/register`) included in the sitemap**
Auth entry points are typically excluded from indexation (robots.ts disallows only admin/user/api). Priority 0.3 "monthly" pages of marginal SEO value.

**L7 · CSS-2 · `globals.css:8,130` — dead duplicate `--color-primary` token**
`@theme { --color-primary: #6366f1 }` (line 8, indigo) is shadowed by the later `@theme inline { --color-primary: var(--primary) }` (line 130 → `#001eff`). The literal indigo value is dead; keeps two sources of truth for "primary".

**L8 · CSS-3 · `globals.css:161,195` + `:20,193` — destructive collides with accent; muted text is purple**
`--destructive: #ff008d` is identical to `--accent: #ff008d` (dark: `--destructive: #ff008d`, `--accent: #ff008d`) — no semantic distinction for error/destructive UI. `--muted-foreground: #8900ff` (dark) and `--color-text-muted: #8900ff` (dark) use brand purple where gray is conventional; legibility of muted text at #8900ff on near-black `#1c1c1c` card is borderline.

## Rules checked, no findings

- **I.1 'use client' necessity:** correct in all 5 files that need it (`error.tsx`, `global-error.tsx`, `providers.tsx` — required; `layout.tsx`, `loading.tsx`, `not-found.tsx` correctly server). `opengraph-image.tsx`/`robots.ts`/`sitemap.ts` correctly directive-free.
- **III server→client leaks:** none. `layout.tsx` (server) renders client children (`Providers`, `AdZoneColumns`, `Analytics`, `Script`) correctly; `providers.tsx` imports only `'use client'` modules; `AuthContext` (uses `useQueryClient`, `AuthContext.tsx:101`) sits inside `QueryClientProvider` — ordering `ErrorBoundary → QueryClientProvider → AuthProvider → ThemeProvider → LanguageProvider → Toaster/GlobalErrorHandler` matches every real dependency.
- **I.5 aliases:** all cross-tree imports in the 10 files use `@/`; `tsconfig.json:30` maps `@/* → ./src/*`. One file uses a local import only (`./providers`, `./globals.css` — correct).
- **robots/sitemap consistency:** both derive `BASE_URL` identically; `robots.ts` correctly omits `sitemap:` when base missing (M4 is the divergence).
- **Metadata shape (`layout.tsx:11-31`):** title template, description, OG + twitter present; static metadata in root layout is appropriate (I.1 note). No dynamic routes in these 10 files, so `generateMetadata` not required.

## Environment evidence (values redacted)

- `.env.local`: `NEXT_PUBLIC_GATEWAY_URL` present; `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN` **absent**.
- `.env.example`: only `NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN` (empty). No documented `NEXT_PUBLIC_SITE_URL`.
- `package.json`: `next ^16.2.10`, `react ^19.2.7`, `shadcn ^4.16.0`, `@vercel/analytics ^2.0.1` — all imports in the 10 files resolve against installed deps.

## Summary

0 High · 4 Med · 8 Low. Root layout/providers/seo-files are structurally sound; the actionable items are all one-liners: make `metadataBase` unconditional + document `NEXT_PUBLIC_SITE_URL`, guard `sitemap.ts` BASE_URL, guard `error.message` display, and stop relying on global styles in `global-error.tsx`.
