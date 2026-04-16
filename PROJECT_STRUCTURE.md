/*
  LightStory - Clean Architecture & RBAC System
  
  /src
    /core
      supabase.ts            - Supabase singleton client
    /domain                  - Core logic & entities
      entities.ts            - Story, Chapter, Setting interfaces
      repositories.ts        - Repository interface definitions
    /infrastructure          - Data access & implementations
      /repositories
        SupabaseStoryRepository.ts
        SupabaseChapterRepository.ts
        SupabaseSettingsRepository.ts
    /presentation            - MVP/MVVM pattern logic
      /mvp
        AdminPresenter.ts
        ReaderPresenter.ts
    /shared
      /components
        ErrorBoundary.tsx    - Global error safety
        LoginModal.tsx       - Unified auth interface
        RoleProtectedRoute.tsx - RBAC-aware route guard
    /components              - Reusable UI blocks
      AdminLayout.tsx        - Master admin wrapper
      StoryForm.tsx          - Dedicated story creation tab
      AdManager.tsx          - Ad script configuration
      AdminUserManagement.tsx - RBAC management
      AdRenderer.tsx         - Dynamic script injector
    /modules
      /auth
        AuthContext.tsx      - Unified Auth management
      /theme
        ThemeContext.tsx     - FOUC-proof theme syncing
    /pages                   - View entry points
      HomePage.tsx           - Story discovery
      ReaderPage.tsx         - Multi-theme reading view
      AdminDashboard.tsx     - Tabbed management portal
    App.tsx                  - Router config & providers
*/
