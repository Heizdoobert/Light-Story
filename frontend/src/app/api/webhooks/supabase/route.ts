import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[Supabase Webhook Received]:', payload);
    return NextResponse.json({ received: true, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
