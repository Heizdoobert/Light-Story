# Audit & Validation Documentation

## 1. Overview of Audit Items
Summary of security and performance audit fixes.

## 2. Manual Validation Checklist
- [ ] Verify RLS on site_settings.
- [ ] Check increment_story_views for idempotency.
- [ ] Test role escalation prevention in handle_new_user.
- [ ] Validate cache invalidation on liked stories.

## 3. Performance Benchmarks Baseline
- Database query latency: < 50ms.
- Frontend TTI: < 2.5s.

## 4. Rollback Procedures
- Use git revert for code changes.
- Roll back Supabase migrations using supabase db remote rollback.