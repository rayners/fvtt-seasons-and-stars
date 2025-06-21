/**
 * ESLint Configuration for Seasons & Stars
 * Uses shared foundry-dev-tools configuration
 */

import foundryConfig from '@rayners/foundry-dev-tools/eslint';

export default [
  // Use the shared Foundry VTT configuration
  ...foundryConfig,

  // Project-specific overrides for source files only
  {
    files: ['src/**/*.{js,ts}'],
    rules: {
      // Temporarily relax some rules for migration
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-case-declarations': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Ignore test files and type definition files completely
  {
    ignores: ['test/**/*', 'dist/', 'node_modules/', 'coverage/', '*.js', '*.mjs'],
  },
];
