import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Flat ESLint config for the frontend project
const eslintConfig = [
  // Ignore generated / build files
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      ".next*/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "**/*.json",
      "**/*.md",
      "scripts/**",
      "src/lib/sdk_archived/**",
      "src/lib/sdk_old/**",
      "src/setupTests.ts",
    ],
  },

  // Next.js core web vitals and TypeScript recommended rules
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Additional project‑specific legacy rules (warn only)
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  // Relax explicit any for test files and mocks
  {
    files: [
      "**/__tests__/**/*.{js,jsx,mjs,ts,tsx}",
      "**/*.test.{js,jsx,mjs,ts,tsx}",
      "**/*.spec.{js,jsx,mjs,ts,tsx}",
      "tests/**/*.{js,jsx,mjs,ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
