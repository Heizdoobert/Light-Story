# Performance Ledger — Light-Story

Budgets: LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1 · JS initial load < 200KB gzip · covers ≤ 200KB
Measurement: prod build + `next start`, Chrome DevTools trace / Lighthouse, same conditions per comparison.

## Baseline (2026-08-10, prod build, empty DB — content LCP unmeasurable without seed data)

| Route | JS gzip | LCP | CLS |
|---|---|---|---|
| `/` (home) | 420.2 KB (23 chunks) | 531 ms | 0.02 |
| `/search` | 406.3 KB (22) | – | – |
| `/comics` | 406.3 KB (22) | – | – |
| reader `/comics/1/chapter/1` | 476.6 KB (28) | – | – |
| `/admin/analytics` | 283.5 KB (17) | – | – |

Home LCP breakdown: TTFB 223ms + render delay 308ms (text LCP, empty state).
Biggest chunks (compressed): supabase-js 58KB, framer/motion 38KB, app shell chunks 33–71KB each.
recharts is route-split correctly (absent from home payload).

## Attempts

| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| SSR homepage + comic detail (ISR 300s, `getServerSupabase` server fetch, hydrated presenter skips client refetch) | client waterfall (stories+chapters+trending fetch after hydration) → no client data fetches on `/`; content in initial HTML | **kept** | Verified via network waterfall: stories/chapters/categories fetches gone. LCP 547→377ms, TTFB 219→11ms (with middleware fix). Content LCP needs seed data for full proof. |
| Skip Supabase `auth.getUser()` in middleware on public routes | TTFB 219ms → 11ms (LCP 547→377ms) | **kept** | Public routes never used the result; auth round-trip was pure latency. Admin/user routes unchanged. |
| Upload-time downscale (covers ≤1000px, chapters ≤1920px, WebP q0.85) | — | **kept** | Deterministic, zero runtime cost; lands at next upload. Runtime resize deferred (Images plan unverified). |
| `<img>` normalization: lazy+decoding+width/height on 12 sites; SearchPageContent → `proxiedR2ImageUrl` | — | **kept** | Standard practice; image-byte impact measurable only with data. |
| Gateway runtime resize via Images binding | — | **deferred** | Account Images API responds but plan level unverified; upload-time downscale covers the main case. |
| AdRenderer 30s poll | — | **skipped** | `fetchAdRuntime` is a stub returning `[]` — no network call. No-op. |
| recharts bundle | — | **verified ok** | Route-split; absent from homepage payload. |
| @next/bundle-analyzer | — | **reverted** | Turbopack-incompatible (no output); attribution done via network measurement instead. |

## Final numbers (2026-08-10, prod build)

| Route | JS gzip (baseline) | LCP | CLS | TTFB |
|---|---|---|---|---|
| `/` after fixes | 420 KB | 377 ms (was 531) | 0.02 | 11 ms (was 219) |

Budgets met: LCP ≤2.5s ✓ · CLS ≤0.1 ✓ · JS 420KB vs 200KB budget (✗ 2.1x — dominated by supabase-js + framer-motion + app shell; no safe single cut identified).


## Notes / evidence

- Gateway `/media/` serves raw R2 with `cache-control: public, max-age=31536000, immutable` (good). No resize/format params — covers/chapter pages ship at upload resolution.
- Uploads convert to WebP (q0.85) client-side at original resolution — no downscale.
- All public pages are `"use client"` shells: home fires supabase categories + trending + newest + chapters batch + history→N×fetchStoryById (N+1) after hydration.
- 15 raw `<img>` sites, zero `next/image`; SearchPageContent uses raw `coverUrl` (no gateway proxy).
- AdRenderer polls ads every 30s via React Query on home.
- Dev-mode numbers are unusable (HMR chunks); always measure prod.
