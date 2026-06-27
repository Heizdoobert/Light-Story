# api-types Adoption — Implementation Plan

Based on: `thoughts/shared/designs/2026-06-12-api-types-adoption-design.md`

## Phase 1 — Expand OpenAPI Spec + Package Restructure

### Task 1: Add component schemas to openapi.yaml
**File**: `packages/api-types/openapi.yaml`
**Action**: Add `components.schemas` section with all entity/DTO types lifted from:
- `frontend/src/types/entities.ts` → Story, Chapter, Category, Author, SiteSetting
- `frontend/src/types/dto.ts` → ApiSuccessResponse, ApiErrorResponse, StoryListRequest/Response, etc.
- `frontend/src/types/analytics.ts` → AnalyticsDashboardResponse, UserEngagementMetrics, etc.
- `frontend/src/lib/apiClient.ts` → ApiResponse<T> envelope shape (discriminated: success vs error)
**Verify**: `npx redocly lint openapi.yaml` or manual review

### Task 2: Add missing endpoints to openapi.yaml
**File**: `packages/api-types/openapi.yaml`
**Action**: Add endpoint definitions for:
- Admin endpoints (profile list, profile update, audit log)
- Analytics dashboard
- Site metrics, role distribution
- All RPC endpoints
**Verify**: All endpoint responses reference schemas from Task 1

### Task 3: Re-generate TypeScript types
**Command**: `npm --prefix packages/api-types run generate`
**Action**: Generate updated `src/generated/index.ts` from the expanded spec
**Verify**: `npm --prefix packages/api-types run typecheck`

### Task 4: Restructure package exports
**File**: `packages/api-types/package.json`
**Action**: Change `"main"` from `"src/generated/index.ts"` to `"src/index.ts"`
**Verify**: `node -e "require('./packages/api-types')"` resolves correctly

### Task 5: Add re-exports to package index
**File**: `packages/api-types/src/index.ts`
**Action**: Add re-exports for generated component schemas alongside existing ApiResponse envelope
**Verify**: TypeScript can resolve `import { Story, Chapter } from '@light-story/api-types'`

### Task 6: Remove dead endpoint-registry.json
**File**: `packages/api-types/endpoint-registry.json`
**Action**: Delete — points to Next.js API routes that no longer exist
**Verify**: No remaining references to this file

## Phase 2 — Frontend Wiring (Pending Phase 1)

### Task 7: Add package to frontend dependencies
**Files**: `frontend/package.json`, `frontend/tsconfig.json`
**Action**:
- Add `"@light-story/api-types": "*"` to frontend dependencies
- Add path alias in tsconfig: `"@light-story/api-types": ["../packages/api-types/src"]`

### Task 8: Migrate apiClient.ts ApiResponse
**File**: `frontend/src/lib/apiClient.ts`
**Action**: Remove inline `interface ApiResponse<T>`, import from `@light-story/api-types`

### Task 9: Migrate dto.ts ApiResponse import
**File**: `frontend/src/types/dto.ts`
**Action**: Replace local `ApiResponse<T>` type with import from `@light-story/api-types`

### Task 10: Verify frontend builds
**Command**: `npm --prefix frontend exec tsc --noEmit`
**Action**: Confirm no regressions from type changes

## Phase 3 — Entity Migration (Future)

- Lift Story, Chapter, etc. entities to shared package
- Re-export from `frontend/src/types/entities.ts`
- Delete local entity definitions
- Workers: adopt envelope types
