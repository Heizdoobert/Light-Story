# CI/CD Pipeline Optimization Design Spec

## Overview
Enhance GitHub Actions CI/CD pipeline (`.github/workflows/deploy.yml` and `.github/workflows/ci.yml`) to add worker validation steps across all 5 Cloudflare Workers (`unified-gateway`, `stories-worker`, `comics-worker`, `admin-worker`, `analytics-worker`), automated pre-commit husky cleanup, and deployment health checks.

## Key Improvements

### 1. Multi-Worker Build & Type-Check Gate
Add type-checking step to `.github/workflows/ci.yml` verifying all domain workers before merging to `main`:
- `workers/unified-gateway`
- `workers/stories-worker`
- `workers/comics-worker`
- `workers/admin-worker`
- `workers/analytics-worker`

### 2. Automated Deprecated Husky Script Cleanup
Clean up deprecated `.husky/pre-commit` initialization lines (`. "$(dirname -- "$0")/_/husky.sh"`) to prevent v10 breaking warnings.

### 3. Production Deployment Hardening (`deploy.yml`)
- Expand wrangler deployment step in `deploy.yml` to support multi-worker deployment.
- Include automated rollbacks if deployment smoke check fails.

## Component & Service Interface

### Workflow Job Structure
```
ci.yml:
├── frontend (Lint & Build)
├── worker-matrix (Type-check 5 workers in parallel matrix)
├── backend-supabase (Schema & SQL validation)
└── api-mock & contract-tests

deploy.yml:
├── validate (Strict TS, Build, Test:run)
└── deploy (Deploy Workers + Supabase Push + Smoke Check + Notification)
```

## Testing Strategy
- Local linting check (`npm --prefix frontend run lint`).
- Dry-run validation of workflow YAML syntax.
