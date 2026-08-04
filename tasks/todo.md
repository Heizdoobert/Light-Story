# Tasks: Frontend Directory Restructuring

- [x] Task 1: Create `src/lib/` structure (constants, utils, supabase, r2, schemas, actions, hooks) & `src/providers/`
  - Acceptance: All utilities, schemas, constants, and providers are placed in their specified locations.
  - Verify: File inspection and imports test.
  - Files: `src/lib/*`, `src/providers/*`

- [x] Task 2: Create `src/components/` structure (ui, layout, comic, admin, user)
  - Acceptance: Components restructured into ui, layout, comic, admin, user with barrel file `ui/index.ts`.
  - Verify: File inspection and typecheck.
  - Files: `src/components/*`

- [x] Task 3: Restructure `src/app/` route groups (`(public)`, `(user)`, `(admin)`, `api/`)
  - Acceptance: Next.js App Router matches the specified tree structure.
  - Verify: Next.js routes inspection and `npm run build`.
  - Files: `src/app/*`

- [x] Task 4: Clean up legacy directories & verify full application build
  - Acceptance: Delete legacy directories (`src/views`, `src/@core`, `src/@layouts`, `src/@menu`, `src/configs`). `npm run lint`, `npm run test:run`, `npm run build` pass without error.
  - Verify: Terminal execution of lint, tests, and build.
  - Files: Entire `frontend/` repository
