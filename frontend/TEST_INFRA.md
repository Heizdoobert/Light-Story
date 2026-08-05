# TEST_INFRA.md — Light-Story Frontend Test Infrastructure

## Test stack
- **Runner**: Vitest (`npm run test:run` = `vitest run`, `npm test` = watch mode)
- **Config**: `frontend/vitest.config.ts` — jsdom + happy-dom environments, aliases (`@/*` → `src/*`), setup file(s)
- **Extra config**: `frontend/vitest.integration.config.ts` (integration suite: `npm run test:integration`)
- **Browser E2E**: Playwright (`frontend/playwright.config.ts`, `npm run test:e2e`)

## Layout
- `src/__tests__/tier1/` — Tier 1 feature coverage (per-feature happy paths), `f{1..7}` (62 tests)
- `src/__tests__/tier2/` — Tier 2 boundary & corner cases, `f{1..7}_boundary` (59 tests)
- `src/__tests__/tier3/` — Tier 3 cross-feature interaction tests (8 tests)
- `src/__tests__/tier4/` — Tier 4 real-world application journeys (17 tests + 1 env-gated skip)

## Conventions
- 7 features under test (see PROJECT.md inventory): auth presenters, RSC pages, barrel exports, worker gateway health, R2 upload, entity type alignment, full-stack module.
- Service-layer tests hit `apiClient`/raw fetch; gateway/worker tests run against the real worker handler imports or probe `http://localhost:8787` (ECONNREFUSED logs are expected when the local worker is down).
- Env-gated tests use `describe.skipIf` and require `NEXT_PUBLIC_SUPABASE_URL` (+ `R2_ACCOUNT_ID` for R2 journeys).

## Verification commands
```
npm run test:run        # full suite (fast)
npm run test:integration
npm run test:e2e        # Playwright (needs dev server / worker)
npm run ci:verify       # lint (stub) + build + test:run
```

## Known issues
- `npm run lint` is a no-op echo stub; real ESLint at repo root crashes with `TypeError: expand is not a function` (minimatch version mismatch in hoisted node_modules, pre-existing). Fix: `npm install minimatch@^9` or `npm dedupe` at repo root.
- `vitest.config.ts` line 18 uses `__dirname` (deprecation warning, cleanup candidate).
