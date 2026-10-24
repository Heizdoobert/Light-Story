import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const currentDir = import.meta.dirname || path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    env: {
      NEXT_PUBLIC_GATEWAY_URL: "http://localhost:8787",
    },
    setupFiles: ["src/setupTests.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", ".opencode", "dist", "**/__integration__/**"],
    maxWorkers: 1,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      thresholds: {
        lines: 55,
        statements: 53,
        functions: 50,
        branches: 43,
      },
    },
  },
  resolve: {
    alias: {
      "react": path.resolve(currentDir, "../node_modules/react"),
      "react-dom": path.resolve(currentDir, "../node_modules/react-dom"),
      "@": path.resolve(currentDir, "./src"),
      "@light-story/sdk": path.resolve(currentDir, "../packages/sdk/src"),
      "@light-story/api-types": path.resolve(currentDir, "../packages/api-types"),
      "@light-story/ui": path.resolve(currentDir, "../packages/ui/src"),
    },
  },
});
