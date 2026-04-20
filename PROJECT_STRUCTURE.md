# Light Story Project Structure

```text
/
  frontend/
    index.html
    package.json
    tsconfig.json
    vite.config.ts
    src/
      App.tsx
      main.tsx
      core/
      domain/
      infrastructure/
      modules/
      pages/
      components/
      shared/
      hooks/
      presentation/

  backend-supabase/
    supabase/
      config.toml
      migrations/
      functions/
      tests/
      seed.sql
    docs/
      db-schema.md
      rls-policies.md
      storage.md

  agents/                     # Local project memory (git-ignored)
  docs/
    architecture/
    adr/
```
