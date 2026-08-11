# Task 11 Report — Real auth pages (login / register / forgetPassword)

**Status:** ✅ Complete — build + tests green, committed.
**Commit:** `9167e98` — `feat(auth): real login/register/forget-password pages (task 11)`
**Branch:** preview

## What was built

### 1. `/auth/login` — `src/app/(public)/auth/login/page.tsx` → `src/components/auth/LoginForm.tsx`
Replaces the "use the top-right login button" stub with a real sign-in form:
- Email + password fields, "Continue with Google", "Send Magic Link" buttons (mirrors the modal's signin mode exactly, including the "or" divider).
- Server page exports `generateMetadata` (title "Đăng nhập", VN description); form renders via a `"use client"` component (same split pattern as the existing `reset-password` page).

### 2. `/auth/register` — `src/app/(public)/auth/register/page.tsx` → `src/components/auth/RegisterForm.tsx`
- Full name + email + password + confirm password form (mirrors the modal's register mode).
- On success: renders an inline success panel ("Registration successful. Please check your email to verify your account.") with a Sign-in link — the page analog of the modal's `setMode("signin")` switch.
- `generateMetadata` (title "Đăng ký").

### 3. `/auth/forgetPassword` — `src/app/(public)/auth/forgetPassword/page.tsx` → `src/components/auth/ForgetPasswordForm.tsx`
- Email-only form calling `sendPasswordReset` (the modal's forgot mode — the modal has no dedicated forgot form; it is mode `"forgot"` of the same handler, wired to `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })`).
- On success: inline "Password reset email sent" panel + Sign-in link (modal analog: `setMode("signin")`).
- `generateMetadata` (title "Quên mật khẩu").

### 4. Shared shell — `src/components/auth/AuthFormShell.tsx` (new)
Small shared presentational shell + `AuthField` (label + optional icon + input) + `authFooterLinkClass`, used by all 3 forms. The 3 forms share the card layout, input styling, submit button, and footer strip, so the shell removes ~3× duplication; each form keeps its own handlers/state. Input classNames are copied verbatim from `login-modal.tsx` so the visual language is identical.

## Modal-flow mirroring evidence

| Modal behavior (`login-modal.tsx`) | LoginForm | RegisterForm | ForgetPasswordForm |
|---|---|---|---|
| `signInPasswordSchema.safeParse(password)` → `toast.error(issues[0].message)` (lines 62–66) | ✅ identical | — | — |
| `signInWithPassword(email, password)` then `toast.success("Signed in successfully")` (lines 67–68) | ✅ identical | — | — |
| post-login: close + `router.refresh()` (lines 69–70) | ✅ `router.push(ROUTES.USER.DASHBOARD)` + `router.refresh()` (page analog of closing the modal surface; per acceptance criteria redirect to `ROUTES.USER.DASHBOARD`) | — | — |
| `!fullName.trim()` → `toast.error("Please enter your full name")` (lines 72–75) | — | ✅ identical | — |
| `resetPasswordSchema.safeParse({password, confirmPassword})` → toast first issue (lines 76–80) | — | ✅ identical | — |
| `register(email, password, fullName.trim())` + success toast (lines 81–84) | — | ✅ identical (toast text identical) | — |
| success → `setMode("signin")` (line 85) | — | ✅ inline success panel + Sign-in link | ✅ inline success panel + Sign-in link |
| `sendPasswordReset(email)` + `toast.success("Password reset email sent. Please check your inbox.")` (lines 89–90) | — | — | ✅ identical |
| catch: `err instanceof Error ? err.message : "Authentication failed. Please check your credentials."` (lines 93–96) | ✅ identical | ✅ identical | ✅ identical |
| `signIn()` Google (lines 102–111, errors ignored) | ✅ identical | — | — |
| magic link: email guard + `signInWithEmail(email)` (lines 113–127) | ✅ identical | — | — |
| Zod schemas from `@/lib/schemas/auth` | ✅ `signInPasswordSchema` | ✅ `resetPasswordSchema` | — (no schema — modal validates nothing on forgot) |

The auth calls all go through the same `useUser()` hook functions (`signInWithPassword`, `register`, `sendPasswordReset`, `signIn`, `signInWithEmail`) — the modal's source of truth. No new auth flow invented.

## Schema changes
`src/lib/schemas/auth.ts` — **unchanged**. Task 9a's `signInPasswordSchema` and `resetPasswordSchema` already cover both flows; the modal does not validate the email field, so no `signInSchema` extension was needed (brief's "e.g." was conditional).

## routes.ts changes
Added `FORGET_PASSWORD: "/auth/forgetPassword"` (line 5). `LOGIN`, `REGISTER`, `RESET_PASSWORD` already existed. Pages link to each other exclusively via `ROUTES.*`: login → `ROUTES.REGISTER` / `ROUTES.FORGET_PASSWORD`; register → `ROUTES.LOGIN`; forgetPassword → `ROUTES.LOGIN`. Cross-links are `<Link>` (real navigation), matching the modal's mode-switch buttons 1:1.

## Files touched
- `frontend/src/app/(public)/auth/login/page.tsx` (rewritten, server + generateMetadata)
- `frontend/src/app/(public)/auth/register/page.tsx` (rewritten, server + generateMetadata)
- `frontend/src/app/(public)/auth/forgetPassword/page.tsx` (rewritten, server + generateMetadata)
- `frontend/src/components/auth/LoginForm.tsx` (new, client)
- `frontend/src/components/auth/RegisterForm.tsx` (new, client)
- `frontend/src/components/auth/ForgetPasswordForm.tsx` (new, client)
- `frontend/src/components/auth/AuthFormShell.tsx` (new, shared shell)
- `frontend/src/lib/constants/routes.ts` (+1 entry)
- `src/components/auth/login-modal.tsx` — **not modified** (reference only)

## Verification
- `npm run build` (workdir `D:\Light-Story\frontend`): ✅ passed. All four routes statically prerendered: `/auth/login`, `/auth/register`, `/auth/forgetPassword`, `/auth/reset-password` (no build errors).
- `npm run test:run`: ✅ 45 files, **385 tests passed** (28.3s). Preexisting non-blocking Vite `configLoader: 'native'` warning about `__dirname` in vitest.config.ts (unrelated to this change).
- Lint (commit hook): `Lint ok`.

## Manual-check notes
- **`/auth/login`**: centered card ("Welcome back" / "Sign in to continue your experience.") with email + password, Sign In, "or" divider, Continue with Google, Send Magic Link; footer links to Register and Forgot password. Empty password → toast "Please enter your password". Bad credentials → red toast with Supabase error message. Successful sign-in → green "Signed in successfully" toast + redirect to `/user/dashboard`.
- **`/auth/register`**: full name / email / password / confirm fields; empty name → "Please enter your full name"; short password or mismatch → schema toast (e.g. "Password must be at least 6 characters", "Password confirmation does not match"); success → green toast + inline success panel with Sign-in link.
- **`/auth/forgetPassword`**: email field only; success → "Password reset email sent. Please check your inbox." + inline panel with Sign-in link. Reset email redirect goes to `window.location.origin` (same as modal); the existing `/auth/reset-password` recovery-flow page handles the `#type=recovery` link — untouched.
- All three pages keep the public header/footer from `(public)/layout.tsx` (the page forms are full-height cards below the header, same as `reset-password`).
- Dark mode: classNames copied from the modal, both themes render.

## Concerns
- The modal validates nothing on the forgot-password email (empty email → Supabase error toast). Mirrored as-is for fidelity; could add an email schema later if desired.
- `/auth/login` post-login redirects to `ROUTES.USER.DASHBOARD` for all roles (admin users land on the user dashboard, then can navigate to admin). The modal instead just closes + refreshes; the page has no surface to "close", so the redirect per the acceptance criteria was chosen.
