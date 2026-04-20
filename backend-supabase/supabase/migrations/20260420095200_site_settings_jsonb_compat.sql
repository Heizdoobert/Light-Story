-- Ensure site_settings.value is JSONB for structured system settings compatibility.

alter table if exists public.site_settings
  alter column value type jsonb
  using (
    case
      when value is null then '{}'::jsonb
      when trim(value::text) = '' then '{}'::jsonb
      when left(trim(value::text), 1) in ('{', '[', '"')
        or lower(trim(value::text)) in ('true', 'false', 'null')
        or trim(value::text) ~ '^-?[0-9]+(\.[0-9]+)?$'
      then value::jsonb
      else to_jsonb(value::text)
    end
  );
