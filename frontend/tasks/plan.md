# Plan: File Architecture Audit & Reorganization

## Objective

Audit every file in the codebase against the provided authoritative Next.js App Router architecture spec. Identify misplaced files, propose correct paths, flag violations.

## Authoritative Spec Rules Applied

- **Root files**: `middleware.ts`, `env.mjs`, `setupTests.ts` belong at root.
- **Types**: `css-modules.d.ts` must go to `types/`.
- **CSS**: `index.css` must merge into `app/globals.css`.
- **Hooks**: All hooks belong in `hooks/common/`, `hooks/features/`, or `hooks/presenters/`. `lib/hooks/` is invalid.
- **Actions**: `actions/` for Client UI mutations. `lib/actions/` is **VALID** for helper/centralized server logic.
- **Schemas**: Belong in `lib/schemas/`. `validation/` is invalid.
- **Security**: Belong in `lib/security/`. `lib/auth/` should be consolidated.

## Audit Results

### 🔴 CRITICAL — Must Fix

| File | Current Path | Issue | Target Path |
|------|-------------|-------|-------------|
| `middleware.ts` | `src/middleware.ts` & `middleware.ts` | Duplicate. Spec says root `/middleware.ts`. | Merge `src/middleware.ts` into root `middleware.ts`. Delete `src/middleware.ts`. |
| `page.ts` | `src/page.ts` | Invalid root page. | **Delete** (already have `app/(public)/page.tsx`). |
| `index.css` | `src/index.css` | Misplaced CSS. | Merge into `src/app/globals.css`, delete `index.css`. |

### 🟡 WARNING — Misplaced Files

| File | Current Path | Target Path (Spec) | Reason |
|------|-------------|-------------------|--------|
| `css-modules.d.ts` | `src/css-modules.d.ts` | `src/types/css-modules.d.ts` | Spec explicit rule |
| `use-admin-*.ts` (12 files) | `src/lib/hooks/` | `src/hooks/features/` & `src/hooks/common/` | All hooks must be in `hooks/` |
| `comic-cms-schemas.ts` | `src/lib/validation/` | `src/lib/schemas/comic-cms-schemas.ts` | Spec merges validation/ into schemas/ |
| `comicCmsTypes.ts` | `src/lib/cms/` | `src/types/comicCmsTypes.ts` | All types must be in `types/` |
| `route-auth.ts`, `security-utils.ts` | `src/lib/auth/` | `src/lib/security/` | Spec consolidates auth/RBAC into security/ |
| `favicon.ico` | `src/app/(admin)/` | `public/favicon-admin.ico` or Delete | Static assets belong in `public/` |

### 🟢 CORRECT — No Action Needed

- `src/lib/actions/*.actions.ts` -> VALIDated by spec (`/lib/actions/` is explicitly allowed for helper server actions).
- `src/app/**` -> All `page.tsx` and `route.ts` are correctly placed.

## Proposed Moves

```bash
# Critical Fixes
DELETE src/page.ts
MERGE  src/middleware.ts -> middleware.ts (Root)
MERGE  src/index.css -> src/app/globals.css

# Small File Moves
MOVE   src/css-modules.d.ts -> src/types/css-modules.d.ts
MOVE   src/app/(admin)/favicon.ico -> public/favicon-admin.ico
MOVE   src/lib/validation/comic-cms-schemas.ts -> src/lib/schemas/comic-cms-schemas.ts
MOVE   src/lib/cms/comicCmsTypes.ts -> src/types/comicCmsTypes.ts
MOVE   src/lib/auth/* -> src/lib/security/

# Hooks Migration (lib/hooks -> hooks/features & hooks/common)
MOVE   src/lib/hooks/use-debounce.ts -> src/hooks/common/use-debounce.ts
MOVE   src/lib/hooks/*.ts -> src/hooks/features/
```
