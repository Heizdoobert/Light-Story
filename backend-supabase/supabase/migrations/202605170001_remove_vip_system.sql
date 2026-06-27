-- Remove VIP system: plans, subscriptions, chapter flag, RLS, triggers
-- VIP content model removed; all published chapters equally accessible

-- 1. Drop FK constraints on vip_subscriptions
ALTER TABLE public.vip_subscriptions DROP CONSTRAINT IF EXISTS vip_subscriptions_user_id_fkey;
ALTER TABLE public.vip_subscriptions DROP CONSTRAINT IF EXISTS vip_subscriptions_plan_id_fkey;

-- 2. Drop VIP tables (CASCADE handles dependent policies/triggers)
DROP TABLE IF EXISTS public.vip_subscriptions CASCADE;
DROP TABLE IF EXISTS public.vip_plans CASCADE;

-- 3. Drop chapters.vip_content column
ALTER TABLE public.chapters DROP COLUMN IF EXISTS vip_content;
