Local dev: Supabase service role key

Quick steps to enable real Supabase access in local dev (do NOT commit your real keys):

1) Obtain the service role key
- In Supabase project dashboard → Settings → API → "Service key (SERVICE_ROLE)". This key has elevated privileges; keep it secret.

2) Set the key in `.env.local` (frontend folder)
- Open `frontend/.env.local` and add:

  SUPABASE_SERVICE_ROLE_KEY=your_real_service_role_key_here
  SUPABASE_URL=https://<your-project>.supabase.co

- Example PowerShell command (temporary for session):

  $env:SUPABASE_SERVICE_ROLE_KEY = "your_real_service_role_key"
  $env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"

3) Verify locally with the provided test script
- From repository root run:

  npm --prefix frontend run dev

- In another terminal, run the connection test (uses `frontend/.env.local`):

  node frontend/tests/check_supabase_connection.mjs

- Expected output: `Success: able to query site_settings (rows): X`.

Notes
- Never commit service role keys to git. Keep them in `.env.local` or your deployment secret store.
- If you prefer to run without a real Supabase instance, the dev server will fall back to a safe mock client (this prevents UI 500s). To test real data, supply the real `SUPABASE_SERVICE_ROLE_KEY` and restart the dev server.
