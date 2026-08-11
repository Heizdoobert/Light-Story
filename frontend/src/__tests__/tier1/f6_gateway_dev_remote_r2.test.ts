import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

describe('F6 gateway dev R2 binding', () => {
  it('dev:gateway runs wrangler dev with --remote so R2 reads hit the real bucket', () => {
    const pkg = readRepoFile('package.json');
    const devGateway = JSON.parse(pkg).scripts['dev:gateway'];
    expect(devGateway).toContain('--remote');
    expect(devGateway).toContain('wrangler dev');
  });

  it('worker R2 binding matches the single "comic" bucket that uploads write to', () => {
    const config = JSON.parse(readRepoFile('workers/kv-worker/wrangler.jsonc'));
    const binding = config.r2_buckets.find((b: { binding: string }) => b.binding === 'R2_BUCKET');
    expect(binding?.bucket_name).toBe('comic');
  });
});
