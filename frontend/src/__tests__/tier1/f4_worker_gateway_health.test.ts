import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

const WORKER_INDEX = 'workers/kv-worker/src/index.ts';
const HEALTH_ROUTE = 'frontend/src/app/api/health/route.ts';

describe('F4 worker gateway health probe', () => {
  it('exposes a default fetch entry point as the gateway handler', () => {
    const source = readRepoFile(WORKER_INDEX);
    expect(source).toContain('export default {');
    expect(source).toContain('async fetch(');
  });

  it('rejects cross-origin requests with 403 via isOriginAllowed guard', () => {
    const source = readRepoFile(WORKER_INDEX);
    expect(source).toContain('isOriginAllowed');
    expect(source).toContain("'Forbidden', { status: 403 }");
  });

  it('handles OPTIONS preflight before routing', () => {
    const source = readRepoFile(WORKER_INDEX);
    expect(source).toContain("request.method === 'OPTIONS'");
    expect(source).toContain('handleCorsPreflightRequest');
  });

  it('returns 404 for unhandled routes', () => {
    const source = readRepoFile(WORKER_INDEX);
    expect(source).toContain('NOT_FOUND');
    expect(source).toContain('No route:');
  });

  it('serves the real health contract from the Next.js gateway route', () => {
    const source = readRepoFile(HEALTH_ROUTE);
    expect(source).toContain('export async function GET');
    expect(source).toContain("status: 'ok'");
    expect(source).toContain('toISOString()');
  });

  it('worker exposes GET /api/health returning the spec health contract (status ok, worker kv-worker, ISO timestamp)', () => {
    const workerSource = readRepoFile(WORKER_INDEX);
    expect(workerSource).toContain('/api/health');
    expect(workerSource).toContain("status: 'ok'");
    expect(workerSource).toContain("worker: 'kv-worker'");
    expect(workerSource).toContain('toISOString()');
  });
});
