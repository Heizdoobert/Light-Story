# Technical Implementation Plan: App Router & Presenter Separation

## Architecture Strategy
Extract stateful logic into custom Presenter Hooks (`src/hooks/presenters/`) and keep UI components (`src/components/`) focused strictly on presentation.

## Target Areas & Order
1. **Comics / Home Presenter**:
   - Create `src/hooks/presenters/useHomePagePresenter.ts`
   - Refactor `src/components/comics/HomePage.tsx` to use hook.
2. **Admin Dashboard & Tabs Presenter**:
   - Audit `src/components/admin/dashboard/AdminDashboard.tsx` and admin tabs.
   - Extract stateful fetching to `useAdminDashboardPresenter.ts`.
3. **Auth & User Profile Presenter**:
   - Audit `src/components/auth/LoginModal.tsx` & `src/components/auth/ResetPasswordPage.tsx`.
   - Extract presenter logic if needed.
4. **Verification**:
   - TypeScript build check.
