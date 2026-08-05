import { NextResponse } from 'next/server';
import getServerSupabase from '@/lib/supabase/server';

/**
 * GET /api/health
 * Health check endpoint for container / orchestrator liveness and readiness probes.
 * Verifies database connectivity alongside static status.
 */
export async function GET() {
  const checks: Record<string, string> = {
    status: 'ok',
    worker: 'kv-worker',
    timestamp: new Date().toISOString(),
  };

  // Verify Supabase database connectivity
  try {
    const supabase = getServerSupabase();
    if (supabase) {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      checks.database = error ? 'unhealthy' : 'healthy';
    } else {
      checks.database = 'unconfigured';
    }
  } catch {
    checks.database = 'unreachable';
  }

  const isHealthy = checks.database === 'healthy' || checks.database === 'unconfigured';

  return NextResponse.json(checks, { status: isHealthy ? 200 : 503 });
}
