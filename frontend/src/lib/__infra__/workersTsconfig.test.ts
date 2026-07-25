import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

interface WorkerTsconfig {
  compilerOptions: {
    target: string;
    module: string;
    moduleResolution: string;
    lib: string[];
    types: string[];
    strict: boolean;
    skipLibCheck: boolean;
    noEmit: boolean;
  };
  include: string[];
}

function readTsconfig(relativePath: string): WorkerTsconfig {
  const raw = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
  return JSON.parse(raw);
}

describe.each([
  ['workers/r2-signed-url/tsconfig.json'],
  ['workers/unified-gateway/tsconfig.json'],
])('%s', (relativePath) => {
  it('is valid, parseable JSON', () => {
    expect(() => readTsconfig(relativePath)).not.toThrow();
  });

  it('enables strict mode', () => {
    const config = readTsconfig(relativePath);
    expect(config.compilerOptions.strict).toBe(true);
  });

  it('keeps the expected lib entries', () => {
    const config = readTsconfig(relativePath);
    expect(config.compilerOptions.lib).toEqual(['ESNext', 'WebWorker']);
  });

  it('keeps the Cloudflare Workers types entry', () => {
    const config = readTsconfig(relativePath);
    expect(config.compilerOptions.types).toEqual(['@cloudflare/workers-types']);
  });

  it('keeps the expected include patterns', () => {
    const config = readTsconfig(relativePath);
    expect(config.include).toEqual(['src/**/*', 'worker-configuration.d.ts']);
  });

  it('retains the unrelated compiler options untouched by this change', () => {
    const config = readTsconfig(relativePath);
    expect(config.compilerOptions.target).toBe('ESNext');
    expect(config.compilerOptions.module).toBe('ESNext');
    expect(config.compilerOptions.moduleResolution).toBe('Bundler');
    expect(config.compilerOptions.skipLibCheck).toBe(true);
    expect(config.compilerOptions.noEmit).toBe(true);
  });
});

describe('worker tsconfig.json consistency', () => {
  it('r2-signed-url and unified-gateway share an identical compiler configuration', () => {
    const r2Config = readTsconfig('workers/r2-signed-url/tsconfig.json');
    const gatewayConfig = readTsconfig('workers/unified-gateway/tsconfig.json');
    expect(r2Config).toEqual(gatewayConfig);
  });
});