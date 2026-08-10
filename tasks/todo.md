# Todo: Dashboard Author Tab, Sidebar Control, Per-Role Visibility

## Phase 1: Authors page + nav

- [x] Task 1: Authors route page + sidebar nav item
  - Acceptance: `/admin/authors` renders `AuthorManagementTab`; sidebar shows "Tác giả & Nhóm dịch" for superadmin/admin/employee
  - Verify: `npm run lint`, `npm run build`, manual nav check
  - Files: `frontend/src/app/(admin)/admin/authors/page.tsx`, `frontend/src/components/layout/admin-sidebar.tsx`

## Phase 2: Sidebar control + per-role visibility

- [x] Task 2: Sidebar settings module
  - Acceptance: `SITE_SETTING_KEYS.sidebarControl` + `SidebarControl` type + `DEFAULT_SIDEBAR_CONTROL` (all staff on) + `parseSidebarControl` (fallback all-on) + `useSidebarSettings` hook (read only)
  - Verify: `npm run lint`
  - Files: `frontend/src/lib/admin/sidebar-settings.ts`, `frontend/src/hooks/features/use-sidebar-settings.ts`

- [x] Task 3: Settings page UI
  - Acceptance: settings page shows sidebar on/off toggle per role (admin, employee) + "Thể loại" visibility per role; saves to `site_settings`
  - Verify: `npm run lint`, manual save/reload
  - Files: `frontend/src/app/(admin)/admin/settings/page.tsx`

- [x] Task 4: Gate sidebar + nav items
  - Acceptance: sidebar hidden for role with `sidebarEnabled=false` (superadmin always on); "Thể loại" hidden when `menuVisibility` excludes it; authors item follows same rule
  - Verify: `npm run lint`, manual role-switch check
  - Files: `frontend/src/components/layout/admin-sidebar.tsx`

## Checkpoint
- [ ] `npm run lint` + `npm run build` pass
- [ ] Superadmin sees all; disabled roles lose sidebar/categories
- [ ] Human review before done
