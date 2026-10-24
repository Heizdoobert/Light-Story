import { test, expect, vi } from 'vitest';

test('logger level switches with NODE_ENV', async () => {
  const originalEnv = process.env.NODE_ENV;

  // Development
  (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  vi.resetModules();
  const { logger: devLogger } = await import('../../sdk/logger');
  expect(devLogger.getLevel()).toBe(devLogger.levels.DEBUG);

  // Production
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
  vi.resetModules();
  const { logger: prodLogger } = await import('../../sdk/logger');
  expect(prodLogger.getLevel()).toBe(prodLogger.levels.ERROR);

  // Restore original env
  (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
});
