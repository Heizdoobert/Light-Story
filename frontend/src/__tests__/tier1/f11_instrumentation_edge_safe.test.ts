import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

describe('F11 instrumentation is edge-runtime safe', () => {
  const src = readRepoFile('frontend/instrumentation.ts');
  const lines = src.split('\n');

  it('has no static node:http import at module scope', () => {
    const staticImport = lines.find((line) =>
      /^\s*import\s+.*from\s*['"]node:http['"]/.test(line)
    );
    expect(staticImport).toBeUndefined();
  });

  it('lazy-loads node:http via dynamic import', () => {
    expect(src).toContain("await import('node:http')");
  });

  it('keeps the lazy import behind the nodejs runtime guard', () => {
    const guardIdx = src.indexOf("NEXT_RUNTIME === 'nodejs'");
    const importIdx = src.indexOf("await import('node:http')");
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(importIdx).toBeGreaterThan(guardIdx);
  });
});
