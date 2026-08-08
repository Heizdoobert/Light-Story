import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
