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
      "superadmin": ["dashboard", "create_story", "stories", "create_chapter", "categories", "authors", "ads", "profile"],
      "admin": ["dashboard", "create_story", "stories", "create_chapter", "categories", "authors", "ads", "profile"],
      "employee": ["dashboard", "create_story", "stories", "create_chapter", "categories", "authors", "profile"],
      "user": ["dashboard", "stories", "profile"]
    }'::jsonb
  )
on conflict (key) do nothing;
