import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

import noLegacyTimezoneRule from "./eslint-rules/no-legacy-timezone.js";
import noHardcodedTimezoneRule from "./eslint-rules/no-hardcoded-timezone.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "prettier"
  ),
  {
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // React specific rules
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off", // Using TypeScript instead
      "react/jsx-uses-react": "off", // Not needed in React 17+
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/no-array-index-key": "warn",
      "react/no-danger": "warn",
      "react/self-closing-comp": "error",

      // General code quality rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "warn",
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-expressions": "error",
      "no-duplicate-imports": "error",
      "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1 }],
      "eol-last": "error",
      "no-trailing-spaces": "error",
      "comma-dangle": ["error", "always-multiline"],
      "semi": ["error", "always"],
      "quotes": ["error", "single", { avoidEscape: true }],

      // Prettier integration handled by eslint-config-prettier
    }
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx}", "src/**/*.{mjs,cjs}"],
    plugins: {
      timezone: {
        rules: {
          "no-legacy-timezone": noLegacyTimezoneRule,
          "no-hardcoded-timezone": noHardcodedTimezoneRule,
        },
      },
    },
    rules: {
      "timezone/no-legacy-timezone": [
        "error",
        {
          allow: [
            "src/utils/timezone\\.ts$",
            "src/lib/env\\.ts$",
            "src/lib/printUtils\\.ts$",
            "src/services/.*",
            "src/utils/telegram.*",
            "src/utils/.*\\.test\\.ts$",
            "src/tests/.*",
            "src/components/print/.*",
            "src/app/print/.*",
            "src/components/calendar/.*",
            "src/app/settings/page\\.tsx$",
            "src/app/appointments/page\\.tsx$",
            "src/components/ui/TimeDisplay\\.tsx$",
          ],
        },
      ],
      "timezone/no-hardcoded-timezone": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off"
    }
  },
  {
    files: ["**/*.config.js", "**/*.config.mjs", "**/*.config.ts"],
    rules: {
      "@typescript-eslint/no-var-requires": "off"
    }
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts"
    ],
  },
];

export default eslintConfig;
