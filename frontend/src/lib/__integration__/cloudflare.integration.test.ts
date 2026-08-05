import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dirname, '../../../..');
const WORKER_DOMAIN = process.env.CF_WORKER_DOMAIN ?? '';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';

const WORKERS = [
  { name: 'kv-worker', routes: ['/'] },
];

const LOCAL_WORKERS = [
  { name: 'kv-worker', file: 'workers/kv-worker/wrangler.jsonc' },
];

describe('Cloudflare Workers - deployed and reachable', () => {
  for (const worker of WORKERS) {
    for (const route of worker.routes) {
      it(`${worker.name} responds at ${route}`, { timeout: 15000 }, async () => {
        const url = `https://${worker.name}.${WORKER_DOMAIN}${route}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(600);
        const text = await res.text();
        expect(text.length).toBeGreaterThan(0);

        if (res.status === 404) {
          const parsed = JSON.parse(text);
          expect(parsed).toHaveProperty('error');
        }
      });
    }
  }
});

describe('Cloudflare Workers - local configs', () => {
  for (const w of LOCAL_WORKERS) {
    it(`${w.name} wrangler config exists`, () => {
      const configPath = resolve(PROJECT_ROOT, w.file);
      expect(existsSync(configPath)).toBe(true);
      const content = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('name', w.name);
      expect(parsed).toHaveProperty('main');
      expect(parsed).toHaveProperty('compatibility_date');
    });
  }
});

describe('R2 Storage', () => {
  it('R2 endpoint reachable', { timeout: 15000 }, async () => {
    const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const res = await fetch(r2Endpoint, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    expect([400, 401, 403, 404]).toContain(res.status);
  });

  it('R2_ACCOUNT_ID configured', () => {
    expect(R2_ACCOUNT_ID).toBeTruthy();
    expect(R2_ACCOUNT_ID.length).toBeGreaterThan(20);
  });
});

describe('Deployed Workers - infrastructure', () => {
  it('kv-worker returns structured errors', { timeout: 15000 }, async () => {
    const res = await fetch(`https://kv-worker.${WORKER_DOMAIN}/`, {
      signal: AbortSignal.timeout(10000),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code', 'NOT_FOUND');
    expect(data).toHaveProperty('timestamp');
  });
});
