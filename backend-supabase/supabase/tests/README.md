# Supabase SQL Tests

This directory stores SQL test scripts for schema integrity and RLS validation.

## Suggested test scope
- Anonymous read access for public stories and chapters.
- Authenticated role-based write access for staff roles.
- Forbidden role escalation for regular users.
- Atomic behavior of increment and like RPC functions.
