import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

describe('F10 middleware CSP allows gateway media', () => {
  it('img-src includes the gateway worker domain so chapter images load', () => {
    const middleware = readRepoFile('frontend/middleware.ts');
    const imgSrc = middleware.match(/img-src[^;]+/)?.[0] ?? '';
    expect(imgSrc).toContain('${workerDomain}');
    const workerDomainLine =
      middleware.match(/const workerDomain[^;]+;/)?.[0] ?? '';
    expect(workerDomainLine).toContain('kv-worker.hhhuygiau.workers.dev');
  });
});
