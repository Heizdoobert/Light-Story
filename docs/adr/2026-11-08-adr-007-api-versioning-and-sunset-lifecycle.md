# ADR-007: API Versioning, Version Locking & Breaking Change Lifecycle

- **Status**: Accepted
- **Date**: 2026-11-08
- **Context**: Light-Story Monorepo (Next.js 16 + Cloudflare Workers Gateway + Supabase RLS)

---

## 1. Context & Motivation
As the Light-Story reading platform evolves, changes to REST contracts, PostgREST queries, and Server Actions must not disrupt production clients or mobile reader sessions. Prior to this decision, routes were partially prefixed with `/api/v1/` while some internal endpoints used `/api/`, leading to drift and potential breaking regressions.

## 2. Decision Rules

### 2.1 Route Prefixing & Gateway Normalization
- All newly created public endpoints MUST be prefixed with `/api/v1/` (e.g. `/api/v1/stories`, `/api/v1/health`).
- The Cloudflare Worker Gateway (`workers/kv-worker`) employs `stripApiPrefix(pathname)` to normalize both `/api/v1/*` and legacy `/api/*` requests into standard internal routes while maintaining backwards compatibility.

### 2.2 Version Locking & Breaking Change Policy
When a breaking change (incompatible schema change, required parameter addition, response envelope alteration) cannot be avoided:
1. **Never mutate `/api/v1` in place**:
   - The `/api/v1/*` endpoints remain frozen.
   - All breaking modifications MUST be introduced under `/api/v2/*`.
2. **Branching Strategy for Major Version Locks**:
   - A release maintenance branch `release/v1-lts` is cut from `main`.
   - Feature development for the next generation continues on `v2-preview` before merging to `main`.
3. **Deprecation & Sunset Headers**:
   - Deprecated endpoints on v1 MUST return standardized HTTP headers:
     ```http
     Deprecation: @1772928000
     Sunset: Tue, 08 Nov 2027 00:00:00 GMT
     Link: <https://docs.lightstory.app/api/v2/migration>; rel="successor-version"
     ```
4. **README & Documentation Update**:
   - Every breaking change must be documented in `README.md` and `CHANGELOG.md` under a dedicated **Breaking Changes & Migration** section detailing payload diffs and migration timelines.

### 2.3 Idempotency & Tracing Contracts
- Mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) honor `Idempotency-Key` or `X-Idempotency-Key`, caching the result in Cloudflare KV (`APP_KV`) for 24 hours (86,400s) to prevent duplicate transactions.
- All requests propagate `x-trace-id` and `x-request-id` end-to-end to ensure distributed observability across Cloudflare Workers, Next.js, and Supabase.

### 2.4 Server Actions Security & Admin Actions
- Admin mutations MUST strictly use Next.js Server Actions guarded by `await requireActionRole(ACTION_ADMIN_ROLES)` and validated by Zod schemas via `act()`.
- Admin operations are NEVER exposed via unauthenticated public REST endpoints.
- Database access adheres to Supabase RLS policies utilizing verified JWT bearer claims (`auth.uid() = userId`).

---

## 3. Consequences
- **Positive**: Zero downtime for legacy consumers, predictable deprecation schedule, robust protection against duplicate mutations, and complete auditability.
- **Negative**: Requires maintaining v1 compatibility shims until official sunset dates.
