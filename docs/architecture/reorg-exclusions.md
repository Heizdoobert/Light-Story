# Re‑organization exclusion policy

The following directories are **intentionally excluded** from the functional‑group re‑organization because they contain only development‑time utilities and are not imported by production code:

- `.agents/` – helper scripts and sandbox agents used by the AI tooling infrastructure.
- `scripts/` – one‑off scripts (e.g., `reorg.ts`) that assist developers but are not part of the application runtime.

All other source files must reside under one of the top‑level functional groups:
`frontend/`, `packages/`, `workers/`, or `backend-supabase/`.

Keeping these directories separate ensures:
1. No impact on the production build or runtime.
2. Clear mental model for contributors: anything under the four groups is part of the app; everything else is tooling.
