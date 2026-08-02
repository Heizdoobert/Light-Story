import { NextResponse } from 'next/server';

// ponytail: lightweight health check endpoint for container / orchestrator probes
export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
