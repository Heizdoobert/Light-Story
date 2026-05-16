# API Gateway — Local Setup & JWKS Configuration

To enable full JWT signature verification for the API Gateway, set the JWKS URL from your Supabase project (or other issuer) as a secret or env var.

Local / Preview setup

- For preview environments (wrangler):

  ```bash
  # Store as a secret in the preview environment
  wrangler secret put SUPABASE_JWKS_URL --env preview
  ```

- For local development you can either set `SUPABASE_JWKS_URL` in `wrangler dev` environment or edit `wrangler.jsonc` for a non-secret placeholder (not recommended for production).

Manual test checklist

1. Ensure `SUPABASE_JWKS_URL` is set to `https://<project>.supabase.co/.well-known/jwks.json` for the environment.
1. Start the gateway locally:

  ```bash
  # from repo root
  npm --prefix workers/api-gateway run dev
  ```

1. Send a request with a valid Supabase JWT:

  ```bash
  curl -H "Authorization: Bearer <token>" http://localhost:8787/api/v1/health
  ```

1. If the token is valid and JWKS is reachable, the gateway will verify signature and forward the request. If signature verification fails, the gateway returns `401`.

Notes

- The gateway supports JWKS caching; keys are cached in-memory for 1 hour.
- For production, always use `wrangler secret` or Cloudflare Workers KV/Secrets manager to store JWKS URLs or keys.
