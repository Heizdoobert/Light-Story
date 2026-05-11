# RLS & Authorization Testing Guide

## Overview
This guide covers testing Row Level Security (RLS) policies and authorization logic for the Light Story comic platform across all user roles: anonymous, user, premium, admin, and superadmin.

## Test Files

### 1. SQL-Based Validation (`rls-validation.sql`)
Quick validation of RLS helpers in Supabase editor.

**Usage:**
1. Open [Supabase Dashboard](https://app.supabase.com) → SQL Editor
2. Copy and run `rls-validation.sql`
3. Verify results in output

**What it tests:**
- `is_superadmin()` helper returns correct values
- `is_admin_or_higher()` helper works
- `is_premium_or_higher()` helper works
- VIP chapter policy includes superadmin access

### 2. Node.js Integration Tests (`rls-integration.test.js`)
Comprehensive RLS tests across all roles using Supabase client.

**Prerequisites:**
```bash
# Install dependencies
cd backend-supabase
npm install @supabase/supabase-js

# Set environment variables for test tokens
export TEST_USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # user token
export TEST_PREMIUM_TOKEN="..."  # premium token
export TEST_ADMIN_TOKEN="..."  # admin token
export TEST_SUPERADMIN_TOKEN="..."  # superadmin token
export SUPABASE_URL="http://localhost:54321"  # or your production URL
export SUPABASE_KEY="your_anon_key"
```

**Usage:**
```bash
node supabase/tests/rls-integration.test.js
```

**What it tests:**
- Anonymous: Can read free chapters only
- User: Can read free chapters only
- Premium: Can read free and VIP chapters
- Admin: Can read free and VIP chapters, can update comments
- Superadmin: Full access to all content and operations

### 3. Server-Side Authorization Tests
Test the updated `isAllowedRouteRole()` function in routeAuth.ts.

**Location:** `frontend/src/lib/routeAuth.ts`

**What changed:**
- Added short-circuit check: if role === 'superadmin', return true (bypass allowedRoles check)
- This ensures superadmin can access any endpoint regardless of allowedRoles config

**Manual test:**
```typescript
import { isAllowedRouteRole } from '@/lib/routeAuth';

// Superadmin should bypass all checks
console.assert(isAllowedRouteRole('superadmin', ['admin']) === true);
console.assert(isAllowedRouteRole('superadmin', []) === true);

// Other roles should respect allowedRoles
console.assert(isAllowedRouteRole('admin', ['admin', 'superadmin']) === true);
console.assert(isAllowedRouteRole('admin', ['premium']) === false);
```

## Role Hierarchy

```
superadmin (highest)
  ├─ admin
  │   └─ premium
  │       └─ user
  │           └─ anonymous (lowest)
```

### Permissions by Role

| Role | Free Chapters | VIP Chapters | Comments (CRUD) | Settings | System Admin |
|------|--------------|-------------|-----------------|----------|-------------|
| anonymous | ✅ | ❌ | ❌ | ❌ | ❌ |
| user | ✅ | ❌ | ✅ (own) | ❌ | ❌ |
| premium | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| admin | ✅ | ✅ | ✅ (all) | ✅ | ✅ |
| superadmin | ✅ | ✅ | ✅ (all) | ✅ | ✅ (full) |

## Running Tests in CI/CD

Add to your GitHub Actions or deployment pipeline:

```yaml
- name: Validate RLS Policies
  run: |
    cd backend-supabase
    export TEST_USER_TOKEN=${{ secrets.TEST_USER_TOKEN }}
    export TEST_PREMIUM_TOKEN=${{ secrets.TEST_PREMIUM_TOKEN }}
    export TEST_ADMIN_TOKEN=${{ secrets.TEST_ADMIN_TOKEN }}
    export TEST_SUPERADMIN_TOKEN=${{ secrets.TEST_SUPERADMIN_TOKEN }}
    node supabase/tests/rls-integration.test.js
```

## Troubleshooting

### "Token invalid or expired"
- Refresh test tokens from Supabase auth
- Ensure tokens have correct user roles in profiles table

### "RLS policy violates access"
- Verify migrations have been applied: `202605110001_security_hardening_comments_ratings.sql` and `202605110002_add_superadmin_helpers.sql`
- Check user roles in `profiles` table match test token user IDs

### "Helper functions not found"
- Apply migration `202605110002_add_superadmin_helpers.sql`
- Verify functions exist: `SELECT * FROM pg_proc WHERE proname LIKE 'is_%'`

## Migration Checklist

- [ ] Applied `202605110001_security_hardening_comments_ratings.sql`
- [ ] Applied `202605110002_add_superadmin_helpers.sql`
- [ ] Updated `frontend/src/lib/routeAuth.ts` with superadmin short-circuit
- [ ] Tested RLS policies with `rls-validation.sql`
- [ ] Tested with Node.js integration tests
- [ ] Verified superadmin can access restricted endpoints
