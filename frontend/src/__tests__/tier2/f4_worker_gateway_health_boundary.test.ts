import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { GET } from '@/app/api/health/route';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

const WORKER_INDEX = 'workers/kv-worker/src/index.ts';
const HEALTH_ROUTE = 'frontend/src/app/api/health/route.ts';

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

async function parseBody(res: Response): Promise<{ status: string; timestamp: string }> {
  return res.json() as Promise<{ status: string; timestamp: string }>;
}

describe('F4 worker gateway health boundary', () => {
  it('GET returns 200 with an ISO-parseable canonical timestamp', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await parseBody(res);
    expect(body.status).toBe('ok');
    expect(ISO_REGEX.test(body.timestamp)).toBe(true);
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('sustains concurrent GETs with every response ok and timestamp valid', async () => {
    const results = await Promise.all(Array.from({ length: 25 }, async () => {
      const res = await GET();
      const body = await parseBody(res);
      return { status: res.status, ok: res.ok, ts: body.timestamp };
    }));
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.ok).toBe(true);
      expect(ISO_REGEX.test(r.ts)).toBe(true);
    }
  });

  it('exposes only GET, so Next.js falls through with 405 for other methods', () => {
    const source = readRepoFile(HEALTH_ROUTE);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(source).not.toContain(`export async function ${method}`);
    }
  });

  it('returns distinct timestamps across repeated calls', async () => {
    const a = await parseBody(await GET());
    await new Promise((r) => setTimeout(r, 2));
    const b = await parseBody(await GET());
    expect(a.timestamp).not.toBe(b.timestamp);
  });

  it('worker falls through to 404 NOT_FOUND echoing method+path for unhandled routes (health probe target)', () => {
    const source = readRepoFile(WORKER_INDEX);
    expect(source).toContain("res = err('NOT_FOUND', `No route: ${request.method} ${pathname}`, 404);");
  });

  it('worker enforces a method guard: non-GET/non-OPTIONS without auth gets 401 before routing', () => {
    const source = readRepoFile(WORKER_INDEX);
    expect(source).toContain("method !== 'GET' && method !== 'OPTIONS' && !authCtx");
    expect(source).toContain("'Authentication required for write operations'");
  });

  it('worker handles OPTIONS preflight before the origin guard (disallowed-origin preflight still answered)', () => {
    const source = readRepoFile(WORKER_INDEX);
    const preflightAt = source.lastIndexOf("request.method === 'OPTIONS'");
    const originGuardAt = source.lastIndexOf('isOriginAllowed');
    expect(preflightAt).toBeGreaterThan(0);
    expect(originGuardAt).toBeGreaterThan(preflightAt);
  });
});
