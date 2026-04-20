# Light Story Release Checklist

## Backend Supabase

- Apply baseline migration to target environment.
- Confirm RLS policies using rls_smoke.sql.
- Confirm RPC presence and schema with rpc_smoke.sql.
- Deploy edge functions and verify runtime env keys.

## Frontend

- Configure frontend/.env values for target environment.
- Run npm run lint in frontend.
- Run npm run build in frontend.
- Verify auth, reader flow, admin dashboard access by role.

## Security and QA

- Validate role escalation path only through app_private.set_user_role.
- Verify anonymous users cannot perform write operations.
- Verify admin and employee operations by profile role.
- Verify ad setting updates are restricted to admin roles.

## Git and Delivery

- Ensure CI is green on branch.
- Prepare PR description with migration notes and rollback notes.
- Tag release with environment and migration version.
