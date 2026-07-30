# Spec: User Route Group + Admin Middleware Protection

## Objective

Separate frontend routing into clear `(user)` and `(admin)` route groups for:
- **Maintainability**: user-facing vs admin code isolated in different folders
- **Security**: server-side middleware blocks `/admin/*` for non-admin users before page loads
- **Routing**: root `/` redirects to `/home` (user landing page)

## Current State

```
src/app/
├── (admin)/admin/        ← Admin dashboard (client-side RoleProtectedRoute guard)
├── (auth)/auth/          ← Auth routes (reset-password)
├── (errors)/             ← Error pages (forbidden, unauthorized, handle-exception)
├── (main)/               ← Public pages (comics, story, search, profile)
├── _components/          ← HomePage, FilterMenu
├── page.tsx              ← Renders HomePage directly at /
├── layout.tsx            ← Root layout (Providers, Footer, AdZoneColumns)
└── providers.tsx
```

## Proposed State

```
src/app/
├── (admin)/admin/        ← UNCHANGED (existing admin dashboard)
├── (auth)/auth/          ← UNCHANGED
├── (errors)/             ← UNCHANGED
├── (main)/               ← UNCHANGED (comics, story, search, profile)
├── (user)/               ← NEW route group
│   ├── layout.tsx        ← User layout (passthrough, same pattern as (main))
│   └── home/
│       └── page.tsx      ← User home page (moves existing HomePage here)
├── _components/          ← Keep FilterMenu; HomePage moves to (user)/home
├── page.tsx              ← CHANGED: redirect to /home
├── layout.tsx            ← UNCHANGED
├── providers.tsx         ← UNCHANGED
└── middleware.ts         ← CHANGED: add admin route protection
```

## Changes

### 1. Root redirect: `page.tsx`
- Replace `<HomePage />` render with `redirect('/home')`
- Server-side redirect (Next.js `redirect()` from `next/navigation`)

### 2. New `(user)` route group
- `(user)/layout.tsx` — passthrough layout (same pattern as `(main)/layout.tsx`)
- `(user)/home/page.tsx` — imports and renders existing `HomePage` component from `_components/HomePage`

### 3. Middleware admin protection: `middleware.ts`
- Add check: if path starts with `/admin`
  - Read Supabase auth token from cookies
  - If no valid session → redirect to `/handle-exception/401`
  - If session exists but role not in `[superadmin, admin, employee]` → redirect to `/handle-exception/403`
- Keep existing CSP headers for all routes
- Use `@supabase/ssr` `createServerClient` to read session from cookies (already a dependency)

### 4. After admin login redirect
- In `RoleProtectedRoute` or `AuthContext`: after successful login, if user role is admin → `router.push('/admin')`
- If user role is regular user → `router.push('/home')`
- This is **existing behavior via RoleProtectedRoute** — no change needed. Admin navigates to `/admin` manually or via nav link.

## Tech Stack
- Next.js App Router (existing)
- `@supabase/ssr` for server-side auth check in middleware
- TypeScript

## Boundaries

### Always
- Server-side middleware blocks admin routes before page loads
- Keep existing `RoleProtectedRoute` client guard as defense-in-depth
- Keep existing CSP headers

### Ask First
- Moving more pages from `(main)` to `(user)` in future

### Never
- Remove client-side `RoleProtectedRoute` guard (defense-in-depth)
- Put admin components in `(user)` group

## Success Criteria
1. `/` → 302 redirects to `/home`
2. `/home` renders existing HomePage
3. `/admin` blocked by middleware for unauthenticated users → redirect to 401 page
4. `/admin` blocked by middleware for non-admin users → redirect to 403 page
5. `/admin` accessible for superadmin/admin/employee roles
6. All existing routes (`/comics/*`, `/search`, `/story/*`, `/profile`) work unchanged
7. `npm run build` passes with no errors

## Open Questions
None — all requirements clarified.
