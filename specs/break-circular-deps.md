# Spec: Break Circular Dependencies in Frontend

- **Author:** AI-assisted
- **Date:** 2026-07-28
- **Status:** Draft

## Context

The graphify knowledge graph analysis of this project (built from commit `8c9d6a8d`) identified two circular dependency cycles in `frontend/src/`:

**Cycle A (3-file):** `systemSettings.ts` → `AuthContext.tsx` → `dto.ts` → `systemSettings.ts`
**Cycle B (4-file):** `adminNavigation.ts` → `AuthContext.tsx` → `dto.ts` → `systemSettings.ts` → `adminNavigation.ts`

Both cycles share the same root cause:

1. `AuthContext.tsx` natively defines and exports `type UserRole = "superadmin" | "admin" | "employee" | "user"` — but both `systemSettings.ts` and `adminNavigation.ts` import `UserRole` from `AuthContext` rather than from a shared type definition.
2. `dto.ts` imports `DashboardTabVisibility` and `SidebarMenuVisibility` from `systemSettings.ts` to define `SystemSettingsSnapshotDto`.
3. `AuthContext.tsx` imports `AdminProfileDto` from `dto.ts`.

The project's CLAUDE.md explicitly warns against this pattern: *"Do not import AuthContext directly inside systemSettings.ts or adminNavigation.ts if dto.ts is re-imported"* and *"Keep DTO definitions (src/types/dto.ts) purely standalone without importing context components."*

Circular imports cause runtime issues in bundlers (Webpack, Next.js), can produce `undefined` imports, complicate testing (requiring `vi.mock` workarounds), and are a code smell indicating improper type ownership.

### Files involved in the cycles

| File | Role | Lines |
|------|------|-------|
| `modules/auth/AuthContext.tsx` | Auth context provider + `useAuth` hook + `UserRole` type | 390 |
| `lib/admin/systemSettings.ts` | System setting keys, parsers, visibility types | 192 |
| `lib/admin/adminNavigation.ts` | Admin menu items, IDs, visibility defaults | 114 |
| `types/dto.ts` | API DTO types for all modules | 214 |

### Files importing `UserRole` from `AuthContext` (must be updated)

| File | Import | Change |
|------|--------|--------|
| `lib/admin/systemSettings.ts:2` | `UserRole` from AuthContext | → import from `@/types/auth` |
| `lib/admin/adminNavigation.ts:2` | `UserRole` from AuthContext | → import from `@/types/auth` |
| `components/shared/auth/RoleProtectedRoute.tsx:4` | `useAuth, UserRole` from AuthContext | → separate import of `UserRole` from `@/types/auth` |
| `admin\_components/users/AdminUserManagement.tsx:4` | `useAuth, UserRole` from AuthContext | → separate import |

### Files involved in `dto.ts` → `systemSettings.ts` import

| File | Import |
|------|--------|
| `types/dto.ts:1` | `DashboardTabVisibility, SidebarMenuVisibility` from `systemSettings` |
| `services/admin/systemSettings.service.ts:9` | `SiteSettingDto, SystemSettingsSnapshotDto` from `dto` |
| `hooks/presenters/useSystemSettingsPresenter.ts:17` | `SystemSettingsSnapshotDto` from `dto` |

## Functional Requirements

- FR-1: Extract `UserRole` to standalone type file.
  A new file `src/types/auth.ts` MUST define:

  ```ts
  export type UserRole = "superadmin" | "admin" | "employee" | "user";
  ```

  The `UserRole` type MUST be removed from its inline definition in `AuthContext.tsx:12`.
  `AuthContext.tsx` MUST import `UserRole` from `@/types/auth` instead.
  `AuthContext.tsx` SHOULD re-export `UserRole` so existing consumers with combined imports (`useAuth, UserRole` from AuthContext) continue to work without immediate changes.

- FR-2: Update `systemSettings.ts` import source.
  `systemSettings.ts:2` MUST change its `UserRole` import from `@/modules/auth/AuthContext` to `@/types/auth`.

- FR-3: Update `adminNavigation.ts` import source.
  `adminNavigation.ts:2` MUST change its `UserRole` import from `@/modules/auth/AuthContext` to `@/types/auth`.

- FR-4: Extract visibility types to standalone settings type file.
  A new file `src/types/settings.ts` MUST define:

  ```ts
  export type DashboardTabVisibility = Record<UserRole, DashboardTabId[]>;
  export type SidebarMenuVisibility = Record<UserRole, AdminMenuId[]>;
  ```

  It MUST import `UserRole` from `@/types/auth` and `DashboardTabId`/`AdminMenuId` from their respective sources.

- FR-5: Update `dto.ts` import source for visibility types.
  `dto.ts:1` MUST change its import source for `DashboardTabVisibility` and `SidebarMenuVisibility` from `@/lib/admin/systemSettings` to `@/types/settings`.

- FR-6: Update `systemSettings.ts` type definitions.
  `systemSettings.ts` MUST import `DashboardTabVisibility` and `SidebarMenuVisibility` from `@/types/settings` instead of defining them inline (after FR-4, they live in `@/types/settings`).

  The type-level definitions for `DashboardTabId` and `AdminMenuId` MUST remain in `systemSettings.ts` (they derive from `DASHBOARD_CONFIGURABLE_TABS` and `ADMIN_MENU_IDS` arrays which are configuration, not pure types).

## Non-Functional Requirements

- **NFR-1:** No runtime behavior changes. The refactoring MUST be purely structural — moving type definitions, changing import paths, no logic changes.
- **NFR-2:** All existing tests MUST pass after the refactoring.
- **NFR-3:** The TypeScript build (`npm run typecheck`) MUST produce zero errors.
- **NFR-4:** Zero new circular dependencies MUST be introduced. Run `madge --circular` or equivalent after changes to verify.

## Acceptance Criteria

### AC-1: UserRole extracted (FR-1, FR-2, FR-3)
Given the file `src/types/auth.ts` exists
When any file imports `UserRole` from `@/types/auth`
Then the type resolves as `"superadmin" | "admin" | "employee" | "user"`

Given `AuthContext.tsx`
When it is inspected
Then it imports `UserRole` from `@/types/auth` and does NOT define `UserRole` inline, AND it re-exports `UserRole` so existing `useAuth, UserRole` imports work

Given `systemSettings.ts` and `adminNavigation.ts`
When inspected
Then they import `UserRole` from `@/types/auth`, NOT from `@/modules/auth/AuthContext`

### AC-2: Visibility types moved (FR-4, FR-5, FR-6)
Given the file `src/types/settings.ts` exists
When inspected
Then it defines `DashboardTabVisibility` and `SidebarMenuVisibility`

Given `dto.ts`
When inspected at line 1
Then it imports from `@/types/settings`, NOT from `@/lib/admin/systemSettings`

Given `systemSettings.ts`
When inspected
Then it imports `DashboardTabVisibility` and `SidebarMenuVisibility` from `@/types/settings`, NOT defining them inline

### AC-3: No behavior change (NFR-1)
Given the app is built
When running `npm run build`
Then it succeeds with zero errors

Given the app is tested
When running `npm run test:run`
Then all tests pass with no regressions

### AC-4: Zero circular deps (NFR-4)
Given the frontend codebase
When running a circular dependency check (e.g., `npx madge --circular frontend/src/`)
Then zero circular dependencies are reported

## Edge Cases

- EC-1: Files that import both `useAuth` and `UserRole` from `AuthContext` (e.g., `AdminUserManagement.tsx`, `RoleProtectedRoute.tsx`) MUST still compile after the change. `AuthContext.tsx` re-exports `UserRole` to support this pattern.
- EC-2: If `src/types/auth.ts` already exists (it does not as of the analysis), the file MUST be appended to, not overwritten.
- EC-3: The `systemSettings.service.ts` and `useSystemSettingsPresenter.ts` files import `SystemSettingsSnapshotDto` from `dto.ts`. Since `dto.ts` no longer imports from `systemSettings.ts`, this chain is now acyclic — but verify that the import chain `service → dto → types/settings` does not itself create a new cycle.
- EC-4: The `src/lib/index.ts` barrel export (`export * from './admin/systemSettings'`) MUST not break. All previously exported types from `systemSettings.ts` (including `DashboardTabVisibility` and `SidebarMenuVisibility`) MUST still be exported — either directly from `systemSettings.ts` (now re-importing from `@/types/settings`) or from the barrel.

## API Contracts

N/A — this is a structural refactoring with no API changes.

### Existing imports that MUST continue working

```ts
// These import patterns must all continue to work unchanged:
import { useAuth } from '@/modules/auth/AuthContext';
import { useAuth, UserRole } from '@/modules/auth/AuthContext';
import { UserRole } from '@/types/auth';                    // new
import { DashboardTabVisibility, SidebarMenuVisibility } from '@/types/settings';  // new
import { DashboardTabVisibility, SidebarMenuVisibility } from '@/lib/admin/systemSettings';  // must still work (re-exported)
```

## Data Models

### New: `src/types/auth.ts`

| Export | Kind | Value |
|--------|------|-------|
| `UserRole` | Type alias | `"superadmin" | "admin" | "employee" | "user"` |

### New: `src/types/settings.ts`

| Export | Kind | Derived from |
|--------|------|--------------|
| `DashboardTabVisibility` | Type alias | `Record<UserRole, DashboardTabId[]>` |
| `SidebarMenuVisibility` | Type alias | `Record<UserRole, AdminMenuId[]>` |

These types are currently defined inline in `systemSettings.ts:31-33` and will be moved to `settings.ts` and re-imported.

### Modified: `src/types/dto.ts`

Remove line 1 import (`from '@/lib/admin/systemSettings'`). Add import from `@/types/settings`.

### Modified: `src/modules/auth/AuthContext.tsx`

Remove inline `UserRole` type definition (line 12). Add import from `@/types/auth`. Re-export.

### Modified: `src/lib/admin/systemSettings.ts`

Change `UserRole` import source (line 2). Remove inline type definitions for `DashboardTabVisibility` and `SidebarMenuVisibility` (lines 31-33). Import them from `@/types/settings`.

### Modified: `src/lib/admin/adminNavigation.ts`

Change `UserRole` import source (line 2).

## Out of Scope

- OS-1: Moving `AdminProfileDto` out of `dto.ts` — not required to break the cycle.
- OS-2: Extracting `useAuth()` hook into a separate file from `AuthContext.tsx` — out of scope for this spec.
- OS-3: Refactoring `getAdminMenuItems` or any navigation logic — structural changes only.
- OS-4: Removing or merging the duplicate `getErrorMessage` in `useGlobalErrorHandler.ts` — separate concern.
- OS-5: Splitting `ComicManagementTab.tsx` God component — separate concern.
- OS-6: Adding lint rules or CI checks for circular dependencies — could be follow-up.