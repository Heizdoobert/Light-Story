-- Seed default system settings for UI behavior and dashboard tab visibility.

insert into public.site_settings (key, value)
values
  (
    'ui_compact_mode',
    'false'::jsonb
  ),
  (
    'ui_show_sync_badge',
    'true'::jsonb
  ),
  (
    'dashboard_tab_visibility',
    '{
      "superadmin": ["dashboard", "dashboard_access_logs", "audit_logs", "operations", "operations_data", "create_story", "stories", "create_chapter", "categories", "authors", "ads", "settings", "profile", "create_comic"],
      "admin": ["dashboard", "dashboard_access_logs", "operations", "operations_data", "create_story", "stories", "create_chapter", "categories", "authors", "ads", "settings", "profile", "create_comic"],
      "employee": ["dashboard", "create_story", "stories", "create_chapter", "categories", "authors", "profile"],
      "user": []
    }'::jsonb
  )
on conflict (key) do nothing;
