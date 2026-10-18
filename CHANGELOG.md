# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-10-18

### Added
- **Standalone `@light-story/sdk` Package**: Extracted zero-runtime-dependency client SDK located at `packages/sdk` using Web Standard APIs (`fetch`, `Headers`, `AbortController`).
- **Resilient Request Pipeline**: Idempotent HTTP method retries (RFC 9110 compliant), safe body auto-serialization (JSON objects vs `FormData`/`Blob`/`ArrayBuffer`), and full-lifecycle request timeouts.
- **Task Management Components**: Added `TaskCreateForm` component with comprehensive UI tests and SDK export.
- **Testing Type Declarations**: Custom `frontend/src/types/testing.d.ts` augmenting Vitest matchers with `@testing-library/jest-dom/matchers`.

### Changed
- **Admin Comics Images**: Migrated standard `<img>` tags in Admin Comics and Profile views to optimized Next.js `<Image>` components with lazy/async decoding.
- **Internationalization (i18n)**: Updated `translations.ts` with bilingual support (`VI`/`EN`) for recommendation cards and accessibility tokens.

### Fixed
- **NextAuth Removal**: Removed obsolete template `src/app/api/auth/[...nextauth]/route.ts` and cleansed `package.json` to adhere strictly to Supabase Auth.
- **TypeScript & ESLint Gates**: Fixed module augmentation conflicts, eliminated all compile errors, and verified 0 ESLint errors across the workspace.
- **Test Suite Stability**: Resolved DOM matcher extensions in `frontend/src/setupTests.ts`, bringing all 79 Vitest suites to 100% pass rate (574 passing tests).

## [1.2.0] - 2026-08-20

### Added
- Multi-category chip filtering for public and admin catalog exploration.
- Cloudflare KV worker caching and gateway security headers.

## [1.1.0] - 2026-07-28

### Added
- Initial Cloudflare R2 media upload and signed URL security integration.
- Supabase authentication and Row Level Security (RLS) enforcement.
