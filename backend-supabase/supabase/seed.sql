-- Light Story MVP seed data for local development.

insert into public.site_settings (key, value)
values
  ('ads_enabled', 'true'::jsonb),
  ('home_banner_text', '"Read stories without limits"'::jsonb)
on conflict (key) do update
set value = excluded.value;
