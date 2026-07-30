# Implementation Plan: User Route Group + Admin Middleware

## Overview
Add `(user)` route group with `/home` page, redirect root `/` → `/home`, and add server-side admin route protection in middleware. 3 files modified, 2 new files.

## Architecture Decisions
- Passthrough layout for `(user)` — same pattern as existing `(main)/layout.tsx`
- Middleware uses `@supabase/ssr` cookie-based session check (no DB call at edge)
- Client-side `RoleProtectedRoute` kept as defense-in-depth
- `HomePage` component stays in `_components/` — `(user)/home/page.tsx` imports it

## Task List

### Phase 1: New Routes
- [ ] Task 1: Create `(user)` route group with `/home` page
- [ ] Task 2: Change root `page.tsx` to redirect → `/home`

### Checkpoint: Routes
- [ ] `npm run build` passes
- [ ] `/` → 302 → `/home`
- [ ] `/home` renders HomePage

### Phase 2: Security
- [ ] Task 3: Add admin route protection in middleware

### Checkpoint: Complete
- [ ] `npm run build` passes
- [ ] `/admin` blocked for unauthenticated users
- [ ] All existing routes work unchanged

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Middleware JWT decode fails silently → admin open | High | Fall through to existing client-side `RoleProtectedRoute` guard |
| `app_metadata.role` stale in JWT | Med | Middleware is first layer; `RoleProtectedRoute` also checks profiles table |
| Redirect loop `/` → `/home` if `(user)` group misconfigured | Low | Test build before committing |
