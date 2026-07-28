# Light-Story Project Guidelines

## 🏛️ Core Architecture Abstractions (God Nodes)
Key central modules derived from the codebase knowledge graph (`graphify-out`):
- `useAuth()`: Central authentication & role context (`AuthContext.tsx`) for user permissions and access control.
- `apiClient`: Centralized HTTP client (`apiClient.ts`) for frontend-to-backend API communication with auto-refresh token handling.
- `useLanguage()`: i18n & localized text translation hook (`LanguageContext.tsx`).
- `ComicManagementTab()` / `StoryManagementTab()`: Core CMS administration hubs for content, chapters, and moderation.
- `err()` / `getErrorMessage()`: Centralized error handling and fallback logger.

## 🏗️ Architecture & Simplification Standards
- **Direct Services & React Query Pattern**: Keep the codebase lean, flat, and maintainable.
  - API endpoint calls: Place in `frontend/src/services/<name>.service.ts` using `apiClient`.
  - State & Mutation Hooks: Place in `frontend/src/hooks/` using `@tanstack/react-query` (`useQuery`, `useMutation`).
  - Next.js App Router: Manage pages and layout in `frontend/src/app/`.
- **Clean Architecture Policy**:
  - Do **NOT** create over-engineered layers (`domain/`, `application/`, `presentation/`, `repositories/`, or `presenters/`).
  - Rely directly on service functions and React Query custom hooks.

## ⚠️ Anti-Patterns & Circular Dependency Restrictions
- **Avoid Circular Imports**:
  - Do not import `AuthContext` directly inside `systemSettings.ts` or `adminNavigation.ts` if `dto.ts` is re-imported.
  - Keep DTO definitions (`src/types/dto.ts`) purely standalone without importing context components.

## 📱 Mobile & UI Responsiveness Standards
- **Modal Containers**: Always include `max-h-[90vh]` and `overflow-y-auto` to prevent vertical clipping on mobile/small viewports.
- **Data Tables**: Wrap data tables in `overflow-x-auto` to allow horizontal scrolling on narrow viewports.
- **Drawer Navigation**: Use topbar hamburger drawers for mobile navigation rather than desktop-only sidebars.

## 🔐 Auth & API Client
- Execute API requests via `apiClient` (`frontend/src/lib/apiClient.ts`).
- `apiClient` automatically handles JWT decoding, expiration checking, and token refresh via Supabase.

## ⚙️ Development & Verification Commands
- **Development**: `npm run dev` (inside `frontend/`)
- **Typecheck / Lint**: `npm run lint` (inside `frontend/`)
- **Production Build**: `npm run build` (inside `frontend/`)
- **Run Unit Tests**: `npm run test:run` (inside `frontend/`)
- **Full CI Check**: `npm run ci:verify` (inside `frontend/`)

## 📊 Graphify Knowledge Graph Rules
- **Before starting work**:
  1. Read `graphify-out/GRAPH_REPORT.md` (top-level overview + community hubs + god nodes).
  2. Read `graphify-out/graph.json` (full knowledge graph) for architecture & dependency tracing.
- **After file changes (creating, modifying, deleting)**:
  1. Run `graphify update .` from the project root to refresh the AST knowledge graph.
  2. Confirm graph consistency in `graphify-out/GRAPH_REPORT.md`.
