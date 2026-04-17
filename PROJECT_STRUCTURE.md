/*
  LightStory - Clean Architecture & RBAC System
  
  /src
    /core
      supabase.ts        - Supabase client initialization
      types.ts           - Shared domain types & interfaces
      constants.ts       - System constants
    /shared
      /components
        Button.tsx       - Reusable button
        Input.tsx        - Reusable input
        AdRenderer.tsx   - Component to inject DB-stored ad scripts
        ThemeToggle.tsx  - Dark mode switcher
    /modules
      /auth
        AuthContext.tsx  - Global auth state & RBAC logic
        Login.tsx        - Admin/Staff login page
      /client
        Home.tsx         - Story browsing page
        Reader.tsx       - Minimalist reading experience
      /admin
        /components
          AdminSidebar.tsx - Role-aware sidebar
        Dashboard.tsx    - Overview stats
        StoryManager.tsx - CRUD for stories
        AdManager.tsx    - Ad script configuration
        UserManager.tsx  - RBAC management (SuperAdmin only)
    /hooks
      useStories.ts      - React Query hooks for story data
      useSettings.ts     - React Query hooks for site config
    App.tsx              - Main router & layout coordinator
*/
