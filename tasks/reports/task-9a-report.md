# Task 9a Report — Fix Batch 3a (auth Zod schema + duplicate metadata)

Date: 2026-08-09 · Implementer: opencode agent

## M9 — Manual auth password validation (ResetPasswordPage + login-modal)

**Before:** `ResetPasswordPage.tsx:40-48` hand-rolled `password.length < 6` / `password !== confirmPassword` checks; `login-modal.tsx:61-64` (`!password`) and `:74-81` (min-length + match) did the same inline. No shared auth schema existed.

**After:** New `frontend/src/lib/schemas/auth.ts` (no `'use server'`, zod v4 per repo convention, style mirrored from `schemas/user.ts`):

- `signInPasswordSchema` — `min(1, "Please enter your password")`
- `passwordSchema` — `min(6, "Password must be at least 6 characters")`
- `resetPasswordSchema` — `{ password: passwordSchema, confirmPassword: string }` + `.refine(password === confirmPassword, { message: "Password confirmation does not match", path: ["confirmPassword"] })`
- `ResetPasswordInput` type export

Wiring:
- `ResetPasswordPage.tsx`: `handleSubmit` parses `resetPasswordSchema.safeParse({ password, confirmPassword })`, toasts `issues[0].message` on failure. Object field order preserves prior behavior (length checked before match).
- `login-modal.tsx`: signin mode parses `signInPasswordSchema` (preserves the distinct "Please enter your password" message — an empty password would otherwise surface the min-6 message, changing existing copy); register mode parses `resetPasswordSchema` (covers both length + match in one parse). Full-name check left inline (not a password rule, out of scope).

**Validation-coverage audit (login-modal):** Rules found were exactly: required password (signin), min 6 chars (register), confirm-match (register). No special-character/uppercase/number rules exist anywhere, so nothing was weakened and nothing extra needed porting. All user-facing messages byte-identical to prior copy.

## M10 — Duplicate generateMetadata on comic detail

**Before:** `(public)/comics/[comicId]/page.tsx:5-36` and `[comicId]/layout.tsx:7-39` both exported `generateMetadata`, each doing its own `stories` Supabase query → 2 DB hits per view.

**After:** Removed `generateMetadata` + now-unused imports (`Metadata`, `getServerSupabase`) from `page.tsx`; it renders `<ComicDetailPageContent />` only. Kept the layout's metadata (fuller title/description/OG set). One query per view.

## Verification

- `npm run build` — passed (all routes compiled, output shown to end).
- `npm run test:run` — 45 files / 385 tests passed.
- `npm run lint` — "Lint ok" (no-op script).
- Commit: `bf08310` (message: `fix(app): shared zod auth schema, drop duplicate comic metadata`)

## Concerns

- `opencode.json` shows as modified in `git status` but was modified before this session; not touched, not staged.
- Signin's required-password check needed a separate `signInPasswordSchema` (not the min-6 `passwordSchema`) purely to keep the existing message; both live in `auth.ts` so future consolidation is one export away.
