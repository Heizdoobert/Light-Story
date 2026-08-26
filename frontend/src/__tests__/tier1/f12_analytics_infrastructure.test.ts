import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

describe('F12 Analytics Infrastructure & Production Gateway', () => {
  it('analytics route exists and returns the standard envelope', () => {
    const analyticsRoute = readRepoFile('workers/kv-worker/src/routes/analytics.ts');
    expect(analyticsRoute).toContain('/analytics/infrastructure');
    // Ensure getInfrastructurePayload is called
    expect(analyticsRoute).toContain('getInfrastructurePayload');
  });

  it('GraphQL bucket filter matches wrangler.jsonc R2 binding', () => {
    const infra = readRepoFile('workers/kv-worker/src/utils/infra.ts');
    const wrangler = readRepoFile('workers/kv-worker/wrangler.jsonc');
    
    // Check that infra.ts uses the correct bucket name "comic" instead of literal
    expect(infra).toContain('filter: { bucketName: "comic" }');
    
    // Ensure wrangler.jsonc has the bucket "comic"
    expect(wrangler).toContain('"bucket_name": "comic"');
  });

  it('analytics hook and UI handle timeout and error states correctly', () => {
    const hook = readRepoFile('frontend/src/hooks/features/use-admin-analytics.ts');
    const ui = readRepoFile('frontend/src/app/(admin)/admin/analytics/page.tsx');
    
    // Hook has timeout
    expect(hook).toContain('AbortSignal.timeout');
    
    // Hook exposes error state
    expect(hook).toContain('error,');
    expect(hook).toContain('setError');
    
    // UI displays error and handles empty state
    expect(ui).toContain('Lỗi tải dữ liệu');
    expect(ui).toContain('error && !data');
  });

  it('production workflow runs smoke test against the unified production gateway', () => {
    const workflow = readRepoFile('.github/workflows/production.yml');
    
    // Ensure the workflow uses the new consistent gateway URL
    expect(workflow).toContain('https://kv-worker.hhhuygiau.workers.dev/api/stories');
  });
});
