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
    files: ['packages/core/src/**/*.{js,ts}'],
    rules: {
      // Temporarily relax some rules for migration
      '@typescript-eslint/no-unused-vars': 'error', // Match GitHub CodeQL strictness
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-case-declarations': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Core test files without TypeScript project (simpler unused var checking)
  {
    files: ['packages/core/test/**/*.{js,ts}'],
    languageOptions: {
      parserOptions: {
        project: null, // Disable TypeScript project checking
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'error', // CodeQL compliance
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },

  // Pack test files without TypeScript project (simpler unused var checking)
  {
    files: ['packages/fantasy-pack/test/**/*.{js,ts}', 'packages/scifi-pack/test/**/*.{js,ts}'],
    languageOptions: {
      parserOptions: {
        project: null, // Disable TypeScript project checking
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'error', // CodeQL compliance
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },

  // Node.js scripts with appropriate environment
  {
    files: ['packages/*/scripts/**/*.js'],
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
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.js',
      '*.mjs',
      '!scripts/**/*.js',
      '*.config.ts',
    ],
  },
];
