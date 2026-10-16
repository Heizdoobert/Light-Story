import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

// Flat ESLint config for the frontend project
export default [
  // Ignore generated / build files
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
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
];
