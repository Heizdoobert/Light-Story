# Agent Long-term Memory

## Architecture Decisions

- Enforce MVP (Model-View-Presenter) + Clean Architecture for frontend.
- Server-only secrets and service roles must live in server-only code paths.

## Conventions

- Frontend: `frontend/`, `frontend/src/`, `src/` for services.
- Backend migrations and SQL: `backend-supabase/`.

## Past Sessions

- 2026-05-01: Executed full agent workflow for orchestration-only request (`do agent workflow`).
- Outcome: updated session/tasks and all `agent/OUTPUTS/*` artifacts with no product code changes.
