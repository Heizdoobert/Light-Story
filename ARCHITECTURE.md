# Light Story Architecture Standard

## Purpose

This document is the repository-wide reference for how Light Story code is organized and how new work should be introduced. It consolidates the design outputs from `agent/OUTPUTS/` into a practical standard for implementation.

## Layering Rules

- Dependencies point inward only.
- Domain code contains business rules and pure types.
- Application code orchestrates use cases, DTOs, and validation.
- Infrastructure code adapts external systems behind interfaces.
- Presentation code handles transport, routing, and response shaping only.

## Repository Layout

### Frontend

- `frontend/src/shared/core` holds base abstractions such as `BaseService`, `BaseRepository`, `DomainError`, `GlobalExceptionHandler`, `Logger`, and `Result`.
- `frontend/src/domain` contains entities and repository interfaces.
- `frontend/src/application` contains DTOs and use cases.
- `frontend/src/infrastructure` contains Supabase adapters and other external integrations.
- `frontend/src/presentation` and `frontend/src/app` handle UI and API entry points.
- `frontend/src/services/analytics.service.ts` reads `CLOUDFLARE_ANALYTICS_WORKER_URL` for infrastructure analytics data and must stay browser-safe.

### Backend D1 SaaS

- `backend-d1-saas/src/shared/core` holds shared runtime utilities, error handling, logging, and result helpers.
- `backend-d1-saas/src` organizes worker handlers, provisioning flows, and tenant operations.

### Backend Supabase

- `backend-supabase/supabase/functions` contains deployed function handlers and their shared helpers.
- `backend-supabase/supabase/migrations` owns schema changes.
- `backend-supabase/docs` captures database and policy notes.
- `backend-supabase/workers/analytics-aggregator.ts` is the Cloudflare Worker that powers the analytics dashboard's infrastructure metrics endpoint.

## Standard Practices

- New features start as a use case, not as direct route logic.
- Repositories must be injectable and must not leak transport concerns.
- Validate request payloads before business logic executes.
- Use `DomainError` subclasses for known failures.
- Use `GlobalExceptionHandler` or equivalent transport middleware to map errors to safe responses.
- Include a request trace id in every error response.
- Keep code style and naming consistent with the surrounding layer.

## Validation Expectations

- Keep layer imports pointed inward.
- Avoid direct database or storage access outside infrastructure code.
- Prefer small, testable changes over broad refactors.
- Verify new code with the narrowest relevant check before widening scope.

## Reference Docs

- `frontend/ARCHITECTURE.md`
- `agent/OUTPUTS/TechLead_architecture_blueprint.md`
- `agent/OUTPUTS/Developer_code_templates.md`
- `agent/OUTPUTS/Tester_architecture_validation.md`
- `agent/OUTPUTS/CrossCheck_comprehensive_review.md`
