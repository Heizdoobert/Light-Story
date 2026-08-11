import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseWebhookSchema } from '@/lib/schemas/webhook';

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || '';

/**
 * Verify webhook request signature using HMAC-SHA256.
 * Supabase sends the signature in the `x-supabase-signature` header.
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;

  try {
    const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/supabase
 * Receives incoming webhook events from Supabase database or auth triggers.
 * Verifies HMAC-SHA256 signature before processing.
 */
export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  // Verify webhook signature (skip in development if secret not set)
  const signature = request.headers.get('x-supabase-signature');
  if (WEBHOOK_SECRET) {
    if (!verifySignature(rawBody, signature)) {
      console.warn('[Supabase Webhook] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[Supabase Webhook] SUPABASE_WEBHOOK_SECRET is not configured in production');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Parse and validate payload
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const result = supabaseWebhookSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }
  const payload = result.data;

  // Log received event
  const eventType = payload.type || payload.event || 'unknown';
  const table = payload.table || (payload.record as Record<string, unknown>)?.id || 'unknown';
  console.log(`[Supabase Webhook] Event: ${eventType}, Table: ${table}`);

  return NextResponse.json(
    { received: true, event: eventType, timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
