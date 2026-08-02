# Project: Light-Story Web Application

## Architecture
- **Frontend**: Next.js App Router (`frontend/src/app/`), React Server Components (RSC) for page entry points (6–20 lines pure routing wrappers).
- **Presenter Hooks**: `frontend/src/hooks/presenters/` isolating UI state and async handlers from presentation JSX.
- **Feature Hooks**: `frontend/src/hooks/features/` & `common/` encapsulating React Query custom hooks.
- **Service Layer**: `frontend/src/services/` flat un-overengineered API client service layer (`apiClient.ts`, `story.service.ts`, `chapter.service.ts`, `comic.service.ts`, `readerHub.service.ts`, `admin.service.ts`).
- **Backend**: Supabase PostgreSQL database + Auth + RLS policies (`backend-supabase/`), Cloudflare Worker API gateway (`workers/kv-worker/`).
- **Git Branching**: `fix/bug-fix` (development), `main` (production).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Presenter Hook Extraction | `useAuthModalPresenter` & `useResetPasswordPresenter` in `src/hooks/presenters/` | M1 | survey (R1) |
| 2 | App Router RSC Alignment | Page entry points in `src/app/` are Server Components (no top-level `'use client'`, 6-20 lines) | M1 | survey (R2) |
| 3 | Presenter Hook Barrel Exports | Export remaining presenter hooks in `frontend/src/hooks/index.ts` | M1 | survey (Obs) |
| 4 | Worker Gateway Health Probe | `/api/health` status endpoint in `workers/kv-worker/src/index.ts` | M2 | survey (Obs) |
| 5 | R2 Upload Standardization | Standardize `uploadFilesToR2` in `comic.service.ts` to use `apiClient` | M2 | survey (Obs) |
| 6 | Entity Type Alignment | Align `Chapter` status type in `entities.ts` with DB enum `chapter_status` | M2 | survey (Obs) |
| 7 | Full-Stack Feature Module | End-to-end integration: UI, presenter hooks, feature hooks, service layer, backend status checks | M3 | survey (R1/R2) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Frontend RSC & Presenters | Verify & harden RSC compliance, presenter hooks, and barrel exports in `frontend/src/hooks/index.ts` | none | IN_PROGRESS |
| 2 | M2: Backend & API Service Hardening | Gateway health endpoint (`workers/kv-worker`), R2 upload standardization (`apiClient`), `Chapter` entity type alignment | M1 | PLANNED |
| 3 | M3: Full-Stack E2E Feature Integration | Full-stack feature integration, responsive UI, status checks, React Query custom hooks | M2 | PLANNED |
| 4 | M4: Final Integration & Hardening | 100% E2E test pass across Tiers 1-4, Tier 5 adversarial hardening, Forensic Audit | M3 | PLANNED |

## Interface Contracts
### `frontend/src/services/` ↔ `workers/kv-worker/`
- Base URL: `apiClient` routes requests to Gateway (`NEXT_PUBLIC_GATEWAY_URL`)
- Auth: Bearer token from Supabase session (`getAccessTokenAsync`)
- Gateway Health Endpoint: GET `/api/health` -> `{ status: 'ok', worker: 'kv-worker', timestamp: string }`
- R2 Uploads: POST `/api/admin/upload-to-r2` -> `{ url: string, key: string }` via `apiClient`

### `frontend/src/app/` ↔ `frontend/src/hooks/presenters/`
- `page.tsx`: Pure Server Component routing wrapper (6-20 lines) calling Client Component
- Client Component: Calls Presenter Hook `use[Feature]Presenter()` for UI state and handlers

## Code Layout
- Frontend: `D:\Light-Story\frontend\src\`
- Backend Supabase: `D:\Light-Story\backend-supabase\`
- Cloudflare Workers: `D:\Light-Story\workers\kv-worker\`
- Agent State: `D:\Light-Story\.agents\`
