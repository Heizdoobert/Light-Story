-- Remove permissive insert policy on admin_audit_logs.
-- admin_audit_logs_insert_function (FOR INSERT WITH CHECK (true), no role clause)
-- was meant for Edge Functions running as service_role — but service_role bypasses
-- RLS entirely, so the policy is dead weight AND lets unauthenticated (anon)
-- clients insert arbitrary audit rows. Staff inserts are covered by
-- audit_logs_insert_staff (mvp_init.sql:3039).
drop policy if exists "admin_audit_logs_insert_function" on public.admin_audit_logs;
