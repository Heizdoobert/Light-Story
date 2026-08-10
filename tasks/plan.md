# Implementation Plan: Dashboard Author Tab, Sidebar Control, Per-Role Visibility

## Overview

Live admin = route-based pages (`src/app/(admin)/admin/*` + `AdminSidebar`). Tabbed `AdminDashboard` is legacy/dead code (mounted nowhere). Three gaps in live system:

1. No "Tác giả & Nhóm dịch" (authors/translators) nav item or page. Component `AuthorManagementTab` already exists — reuse it.
2. Settings page has no sidebar on/off control.
3. No per-role visibility. Scope per user: only the "Thể loại" (categories) menu item. `user` role can't access admin (middleware) — staff roles only (admin, employee).

## Architecture Decisions

- **Reuse `AuthorManagementTab`** (454-line complete CRUD) by mounting it in a new route page. Zero new feature code.
- **New tiny settings module** `sidebar-settings.ts`: one `site_settings` key (`sidebar_control`) holding `{ sidebarEnabled: Record<role, bool>, menuVisibility: Record<role, AdminMenuId[]> }`. Parser with safe defaults (all on). Mirrors existing `system-settings.ts` pattern but minimal.
- **`AdminSidebar` self-contained**: reads role via `useAuth()` + settings via new hook. No layout changes needed.
- **Persistence**: follow existing `use-admin-settings.ts` pattern (direct supabase write to `site_settings`). No new server action, no migration.

## Task List

### Phase 1: Authors page + nav

- [ ] Task 1: Add authors route page + sidebar nav item

### Checkpoint: Authors visible
- [ ] Lint passes, build passes

### Phase 2: Sidebar control + per-role visibility

- [ ] Task 2: Sidebar settings module (types, defaults, parser, hook)
- [ ] Task 3: Settings page UI (sidebar on/off per role + categories visibility per role)
- [ ] Task 4: Gate sidebar + nav items in `AdminSidebar`

### Checkpoint: Complete
- [ ] Lint passes, build passes
- [ ] Superadmin sees everything; disabled roles lose sidebar/categories item
- [ ] Human review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `user` role reaching admin UI | Med | Middleware already blocks `/admin/*`; settings only affect staff roles |
| Broken saved JSON in `site_settings` | Low | Parser falls back to all-on defaults |
| Old tabbed system confusion | Low | Untouched; route-based is canonical |

## Open Questions

- None (user confirmed scope: category-only visibility, staff roles only, per-role sidebar)
