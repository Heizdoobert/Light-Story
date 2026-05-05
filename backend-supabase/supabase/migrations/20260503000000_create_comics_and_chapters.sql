-- Migration intentionally left as a no-op.
-- This file previously created public.comics/public.chapters with a schema
-- that conflicts with the later canonical comics/chapters migration.
-- Keeping this migration as a placeholder preserves migration ordering
-- without creating tables in an unexpected shape.

select 1;