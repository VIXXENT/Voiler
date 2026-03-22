import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    // 1. REGLAS DE ARQUITECTURA (Para archivos TypeScript con información de tipos)
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/typedef": [
        "error",
        {
          "variableDeclaration": true,
          "parameter": true,
          "propertyDeclaration": true,
          "memberVariableDeclaration": true
        }
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "semi": ["error", "never"],
      "quotes": ["error", "single"],
      "object-curly-spacing": ["error", "always"],
      "keyword-spacing": ["error", { "before": true, "after": true }],
      "max-params": ["error", 1],
      "max-len": ["error", { "code": 100, "ignoreUrls": true }],
      "comma-dangle": ["error", "always-multiline"],
      "no-trailing-spaces": "error",
      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "ClassDeclaration",
          "message": "No se permiten clases. Usa patrones funcionales."
        },
        {
          "selector": "TSInterfaceDeclaration",
          "message": "Usa 'type' en lugar de 'interface'."
        },
        {
          "selector": "CallExpression[callee.property.name='then']",
          "message": "Usa async/await en lugar de .then()."
        }
      ],
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
      "curly": ["error", "all"]
    },
  },
  {
    // 2. REGLAS PARA ARCHIVOS JAVASCRIPT/MJS (Sin información de tipos profunda)
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "semi": ["error", "never"],
      "quotes": ["error", "single"],
      "object-curly-spacing": ["error", "always"],
      "no-trailing-spaces": "error",
      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "off",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/drizzle/**",
      "eslint.config.mjs",
      ".gemini/**",
      "_docs/**"
    ]
  }
);
