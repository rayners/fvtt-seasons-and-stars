/**
 * ESLint Configuration for Seasons & Stars
 * Uses shared foundry-dev-tools configuration
 */

import foundryConfig from '@rayners/foundry-dev-tools/eslint';

export default [
  // Use the shared Foundry VTT configuration
  ...foundryConfig,

  // Project-specific overrides for source files
  {
    files: ['src/**/*.{js,ts}'],
    rules: {
      // Temporarily relax some rules for migration
      '@typescript-eslint/no-unused-vars': 'error', // Match GitHub CodeQL strictness
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-case-declarations': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Test files with relaxed rules
  {
    files: ['test/**/*.{js,ts}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
      },
    },
    rules: {
      // Allow more flexibility in test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off', // Allow @ts-ignore in tests for mock types
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },

  // Node.js scripts with appropriate environment
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'writable',
      },
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },

  // Ignore build artifacts and dependencies
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', '*.mjs', '!scripts/**/*.js'],
  },
];
