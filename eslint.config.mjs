// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import-x'
import prettierConfig from 'eslint-config-prettier'

/** @type {import('typescript-eslint').Config} */
const config = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      // --- Semicolons ---
      semi: ['error', 'never'],
      '@typescript-eslint/member-delimiter-style': [
        'error',
        {
          multiline: { delimiter: 'none' },
          singleline: { delimiter: 'semi', requireLast: false },
        },
      ],

      // --- Type annotations ---
      '@typescript-eslint/typedef': [
        'error',
        {
          variableDeclaration: true,
          variableDeclarationIgnoreFunction: true,
        },
      ],

      // --- No any ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // --- Arrow function params ---
      'max-params': ['error', { max: 1 }],

      // --- Trailing commas ---
      'comma-dangle': ['error', 'always-multiline'],

      // --- Curly braces ---
      curly: ['error', 'all'],

      // --- Max line length ---
      'max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignoreComments: false,
        },
      ],

      // --- Imports ---
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',

      // --- Immutability ---
      'prefer-const': 'error',
      'no-var': 'error',

      // --- Security ---
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // --- General quality ---
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/coverage/**'],
  },
)

export default config
