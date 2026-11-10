import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withKeyLock, publicCacheControl } from '../src/middleware/cache';
import { DEFAULT_TTL_SEC } from '../src/config/cache-config';

describe('KV Worker Cache & Lock Tests', () => {
  it('should respect TTL from cache-config', () => {
    const cc = publicCacheControl(DEFAULT_TTL_SEC);
    expect(cc).toContain(`s-maxage=${DEFAULT_TTL_SEC}`);
  });

  it('should handle concurrent withKeyLock correctly', async () => {
    let executionCount = 0;
    const task = async () => {
      executionCount++;
      await new Promise((r) => setTimeout(r, 20));
      return 'result';
    };

    const p1 = withKeyLock('test-key', task);
    const p2 = withKeyLock('test-key', task);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('result');
    expect(r2).toBe('result');
    expect(executionCount).toBe(1);
  });
});
