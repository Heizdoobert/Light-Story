import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['src/setupTests.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    testTimeout: 180000,
    hookTimeout: 180000,
    maxWorkers: 1,
    fileParallelism: false,
  },
});
