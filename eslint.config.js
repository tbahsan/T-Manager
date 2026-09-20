/**
 * ═══════════════════════════════════════════════════════
 *  File    : eslint.config.js
 *  Purpose : Lint rules — readable-code guardrails (plan §১৩).
 *  Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 * ═══════════════════════════════════════════════════════
 */
import globals from "globals";

export default [
  {
    files: ["src/**/*.js", "test/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        browser: "readonly",
        chrome: "readonly",
        __BROWSER__: "readonly", // esbuild define — scripts/build.mjs
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      eqeqeq: "warn",
      "prefer-const": "warn",
    },
  },
];
