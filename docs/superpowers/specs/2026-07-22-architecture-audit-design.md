# Clean Architecture & Edge Worker Audit Design Spec

## Overview
Comprehensive architectural audit and refactoring across the 5 Cloudflare Workers (`unified-gateway`, `stories-worker`, `comics-worker`, `admin-worker`, `analytics-worker`), enforcing strict Clean Architecture principles (Domain -> Application -> Infrastructure) and zero business logic leaks in `unified-gateway`.

## Architecture & Data Flow

### 1. Gateway Worker (`workers/unified-gateway`)
Role: Edge Router & Request Gateway
- Responsibilities: CORS preflight, IP sliding-window rate limiting, JWT authentication & JWKS validation, service binding route dispatch.
- Non-responsibilities: Must NOT perform direct business calculations, story/comic scoring, or DB mutation transformations.

### 2. Domain Workers (`workers/comics-worker`, `workers/stories-worker`, `workers/admin-worker`, `workers/analytics-worker`)
Role: Domain Logic Execution
- **Domain Layer**: Entity interfaces and domain models.
- **Application Layer**: Use cases and business rule execution.
- **Infrastructure Layer**: Supabase REST client bindings and external API adapters.

### 3. Gateway Route Refactoring
Move recommendation scoring helper from `unified-gateway/src/routes/comics.ts` into a clean presenter/service pattern, keeping route dispatch purely declarative.

## Testing Strategy
- Run TypeScript strict type-check across all 5 workers (`npx tsc --noEmit` per worker directory).
- Frontend linting and test execution (`npm --prefix frontend run lint && npm --prefix frontend run test:run`).
