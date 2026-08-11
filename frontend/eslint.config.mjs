import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-disable-next-line import/no-anonymous-default-export -- flat-config standard form
export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Legacy adoption baseline: this codebase was never linted (131 pre-existing
      // errors). These three rules are warn + `--max-warnings` cap until cleaned up
      // (tracked as follow-up work; do NOT add new violations — warnings count in CI).
      "@typescript-eslint/no-explicit-any": "warn", // 96 pre-existing in tests/presenters
      "react-hooks/set-state-in-effect": "warn", // 21 pre-existing fetch-in-effect pattern
      "@next/next/no-img-element": "warn", // gateway-driven images (measured decision, PERF.md)
    },
  },
];
