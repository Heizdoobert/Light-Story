# Task List: File Architecture Reorganization

## Task 1: Delete `src/page.ts`
**Description:** Remove the empty `src/page.ts` file which is invalid in App Router.
**Acceptance criteria:**
- [x] `src/page.ts` is deleted
**Verification:** Build succeeds.
**Dependencies:** None.
**Scope:** XS

## Task 2: Merge CSS (`src/index.css` -> `src/app/globals.css`)
**Description:** Consolidate global CSS into a single file per spec.
**Acceptance criteria:**
- [x] Tailwind/shadcn imports moved to `globals.css`
- [x] `:root` and `.dark` variables merged without conflicts
- [x] `src/index.css` deleted
- [x] `components.json` updated to point to `src/app/globals.css` if necessary
**Verification:** App builds and visual styling remains intact.
**Dependencies:** None.
**Scope:** M

## Task 3: Merge Middleware to Root (`src/middleware.ts` -> `middleware.ts`)
**Description:** Move active middleware logic to root `/middleware.ts` per spec.
**Acceptance criteria:**
- [x] Logic from `src/middleware.ts` combined into root `middleware.ts`
- [x] `src/middleware.ts` deleted
**Verification:** Build passes, auth routing still functions.
**Dependencies:** None.
**Scope:** M

## Task 4: Move `css-modules.d.ts`
**Description:** Move CSS modules declaration to `types/` dir.
**Acceptance criteria:**
- [x] File moved to `src/types/css-modules.d.ts`
**Verification:** Build passes.
**Dependencies:** None.
**Scope:** XS

## Task 5: Migrate `lib/hooks/` to `hooks/`
**Description:** Move 12 hook files from `lib/hooks/` to `hooks/features/` (and `use-debounce` to `hooks/common/`) per spec.
**Acceptance criteria:**
- [x] `src/lib/hooks/use-debounce.ts` moved to `src/hooks/common/`
- [x] Remaining `src/lib/hooks/*.ts` moved to `src/hooks/features/`
- [x] All imports updated across the codebase
**Verification:** Build passes, no broken imports.
**Dependencies:** None.
**Scope:** M

## Task 6: Consolidate Types, Schemas, Security, and Assets
**Description:** Move misplaced files to their canonical directories.
**Acceptance criteria:**
- [x] `src/lib/validation/comic-cms-schemas.ts` -> `src/lib/schemas/comic-cms-schemas.ts`
- [x] `src/lib/cms/comicCmsTypes.ts` -> `src/types/comicCmsTypes.ts`
- [x] `src/lib/auth/*` -> `src/lib/security/`
- [x] `src/app/(admin)/favicon.ico` -> `public/favicon-admin.ico` (or deleted)
- [x] All imports updated
**Verification:** Build passes.
**Dependencies:** None.
**Scope:** S
