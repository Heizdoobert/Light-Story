# Spec: Next.js App Router Architecture Refactoring & Presenter Extraction

## Objective
Refactor `frontend/src` to decouple UI components from business logic:
- Move page/view logic into `src/hooks/presenters/use[Feature]Presenter.ts`.
- Keep `src/app/` strictly for routing entry points.
- Organize UI components in domain-based `src/components/` subdirectories.

## Tech Stack
- Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, Supabase Client.

## Commands
- Build: `npm run build`
- Dev: `npm run dev`
- Lint: `npm run lint`

## Project Structure
```
src/
├── app/                  # Pure Routing Entry Points
├── components/           # UI Components Only (admin, auth, comics, errors, navigation, reader, shared, user)
├── context/              # React Context Providers
├── hooks/
│   ├── common/           # Shared utility hooks
│   ├── features/         # Feature domain hooks
│   └── presenters/       # UI State & Business Logic Presenters
├── infrastructure/       # Supabase client / external services
├── lib/                  # Utilities
├── services/             # API services
└── types/                # TypeScript types
```

## Code Style
Presenter Hook Pattern (`src/hooks/presenters/useHomePagePresenter.ts`):
```ts
export function useHomePagePresenter(initialComics = []) {
  // state, effects, API calls, handlers
  return { state, handlers };
}
```

Page Entry Point Pattern (`src/app/page.tsx`):
```tsx
export default function Page() {
  return <HomePage />;
}
```

UI Component Pattern (`src/components/comics/HomePage.tsx`):
```tsx
export const HomePage: React.FC = () => {
  const { state, handlers } = useHomePagePresenter();
  return <JSX />;
};
```

## Testing Strategy
- Verify builds compile cleanly without TS error (`tsc --noEmit` or `npm run build`).
- Verify zero runtime regressions.

## Boundaries
- **Always**: Keep business logic in `src/hooks/presenters/` or `src/hooks/features/`. Keep UI pure.
- **Ask first**: DB schema changes, package installs.
- **Never**: Alter UX behavior, break TS types, or introduce inline API logic in page entry points.

## Success Criteria
- Zero `_components` or `_presenters` directories inside `src/app/`.
- Every page entry point in `src/app/` <= 50 lines (delegates to `src/components/` and presenter hooks).
- 100% TypeScript compilation without errors.

## Open Questions
- None.
