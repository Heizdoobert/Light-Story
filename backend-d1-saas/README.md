# Multi-tenant D1 SaaS Backend

This package is a standalone Cloudflare Workers backend for a SaaS product where each customer gets an isolated D1 database.

## Architecture

- A control-plane D1 database stores tenant metadata, tenant auth hashes, and the database id for each customer.
- The Worker provisions a new Cloudflare D1 database for every tenant.
- Tenant-scoped requests resolve the tenant record, authenticate with `x-tenant-key`, and execute CRUD against that tenant's own D1 database.
- The sample tenant schema exposes a `stories` table so the isolation model is visible end-to-end.

## Endpoints

### Public Endpoints

- `GET /health` - basic readiness check

### Admin Endpoints (require `X-Admin-Key` header)

- `POST /tenants` - provision a new tenant and create a dedicated D1 database
- `GET /tenants` - list tenants
- `GET /admin/failed-tenants` - list tenants with provisioning failures
- `POST /admin/recover/:tenantId` - recover a failed provisioning attempt

### Tenant Endpoints (require `X-Tenant-Key` header)

- `GET /tenants/:tenantId` - inspect one tenant
- `GET /tenants/:tenantId/stories` - list tenant stories
- `POST /tenants/:tenantId/stories` - create a tenant story
- `GET /tenants/:tenantId/stories/:storyId` - fetch one tenant story
- `PUT /tenants/:tenantId/stories/:storyId` - update a tenant story
- `DELETE /tenants/:tenantId/stories/:storyId` - delete a tenant story

## Environment

Set these values in `wrangler.jsonc` or as secrets:

- `CF_ACCOUNT_ID` - Cloudflare account id used for D1 provisioning
- `CF_API_TOKEN` - API token with D1 database and query permissions
- `ADMIN_API_KEY` - shared admin key for tenant provisioning
- `TENANT_DATABASE_PREFIX` - database naming prefix

The control-plane D1 database is bound as `CONTROL_DB`.

## Local setup

1. Install dependencies with `npm install` inside this folder.
2. Create the control-plane D1 database and apply the migration in `migrations/0001_init.sql`.
3. Update `wrangler.jsonc` with the real `database_id` for the control-plane database.
4. Store `CF_API_TOKEN` and `ADMIN_API_KEY` as Wrangler secrets.
5. Run `npm run dev` to start the worker locally.

## Testing

Run smoke tests against a live worker:

```bash
npm run dev            # In one terminal
npm run test:smoke     # In another terminal
```

See [TESTING.md](TESTING.md) for full testing documentation.

## Recovery from Provisioning Failures

If tenant provisioning fails, use the recovery endpoints:

```bash
# List failed tenants
curl -H "X-Admin-Key: {key}" https://your-backend/admin/failed-tenants

# Recover a specific tenant
curl -X POST -H "X-Admin-Key: {key}" https://your-backend/admin/recover/{tenantId}
```

See [RECOVERY.md](RECOVERY.md) for detailed recovery procedures.

## Notes

- The tenant database schema is defined in `schema/tenant.sql` and is bootstrapped into every new tenant database.
- `tenantKey` is returned only once at provisioning time; store it securely in your SaaS control plane or customer onboarding flow.
- Provisioning includes automatic retry with exponential backoff if the D1 API is temporarily unavailable.
- `category` is stored as JSON text, and `view_count` is tracked as a numeric field for story analytics.
