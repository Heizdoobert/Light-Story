/* 
  VULNERABILITY & ARCHITECTURAL FLAW REPORT (AUDIT v1.0)
  Project: LightStory Management System
  Auditor: Senior Security Architect
  Status: CRITICAL FAILURES IDENTIFIED
*/

1. [SECURITY] Client-Side RBAC Reliance: Previous implementation hid UI based on 'role' from state. An attacker can manually change the React state to 'superadmin' and see the UI. Without RLS, they could fetch data.
2. [SECURITY] RLS Policy "Select True": Using 'true' for SELECT policies on site_settings is a data leak. Sensitive config or ad keys are exposed to the public.
3. [PERFORMANCE] Main Thread Blocking Ads: Injecting scripts via innerHTML/contextualFragment blocks the main thread, killing Lighthouse scores and UX.
4. [UX] Dark Mode FOUC: Initializing theme in useEffect causes a white flash on load. Must be handled in a blocking script or via SSR-safe class injection.
5. [RELIABILITY] No Auto-Save: Writing chapters is high-risk. If the session expires or the tab crashes, 5,000 words are lost.
6. [ARCHITECTURE] Heavy Bundle: Admin and Client logic are in the same main bundle. Readers shouldn't download Admin Dashboard code.
7. [SECURITY] Profile Update Vulnerability: Lack of strict RLS on 'profiles' allows any authenticated user to potentially update their own 'role' if the policy is too broad.
8. [DATA INTEGRITY] Views Race Condition: Incrementing views via simple UPDATE is inaccurate under high load. Needs a database function (RPC).
9. [ERROR HANDLING] Silent Failures: Supabase connection errors are logged to console but not handled via UI Error Boundaries.
10. [UX] Lack of Optimistic Updates: UI waits for DB confirmation for likes/views, making the app feel "laggy".
