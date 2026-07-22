# Deploying Edge Functions to Supabase

This guide covers deploying the `payment_and_rewards` Edge Function for webhook handling and daily check-in rewards.

## Prerequisites

- Supabase project URL and service role key (from `.env`).
- Edge Function code in `backend-supabase/supabase/functions/payment_and_rewards/index.ts`.
- Deno tooling installed (comes with Supabase CLI).

## Local Development

Run Edge Functions locally using `supabase start` (requires Docker) and the local emulator.

```bash
cd backend-supabase
supabase start
```

This starts the local Supabase environment with Edge Functions enabled.

## Deployment to Production

Push the function to your remote Supabase project:

```bash
cd backend-supabase
supabase functions deploy payment_and_rewards --project-id your_project_id
```

Or use the Supabase CLI dashboard:

```bash
supabase link --project-id your_project_id
supabase functions deploy
```

## Environment Secrets

Set required secrets on the Supabase project:

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_service_role_xxxxx
```

## Testing the Webhook

### Local Test (against emulator)

```bash
curl -X POST http://localhost:54321/functions/v1/payment_and_rewards \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_webhook", "data": {"user_id": "user-123", "amount": 9.99, "provider": "stripe"}}'
```

### Remote Test (production)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment_and_rewards \
  -H "Content-Type: application/json" \
  -d '{"type": "daily_checkin", "data": {"user_id": "user-123"}}'
```

## Signature Validation (Optional)

The function currently has a placeholder for provider signature validation. Add your provider's webhook key:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

Then update `payment_and_rewards/index.ts` to verify the signature header.

## Monitoring

View logs in the Supabase dashboard under Edge Functions → Logs, or use the CLI:

```bash
supabase functions logs payment_and_rewards --project-id your_project_id
```
