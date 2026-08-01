- [x] Task 1: Extract `useHomePagePresenter.ts` from `HomePage.tsx`
  - Acceptance: `HomePage.tsx` contains zero direct `useEffect`/fetch logic; delegates to `useHomePagePresenter.ts`.
  - Verify: File exists in `src/hooks/presenters/useHomePagePresenter.ts`.
  - Files: `src/hooks/presenters/useHomePagePresenter.ts`, `src/components/comics/HomePage.tsx`

- [x] Task 2: Extract `useAdminDashboardPresenter.ts` from `AdminDashboard.tsx`
  - Acceptance: `AdminDashboard.tsx` uses `useAdminDashboardPresenter`.
  - Verify: File exists in `src/hooks/presenters/useAdminDashboardPresenter.ts`.
  - Files: `src/hooks/presenters/useAdminDashboardPresenter.ts`, `src/components/admin/dashboard/AdminDashboard.tsx`

- [x] Task 3: Audit and verify zero `_components` or `_presenters` remain in `src/app/`
  - Acceptance: Clean routing tree.
  - Verify: Directory check in `src/app/`.
