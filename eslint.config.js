/**
 * ESLint Configuration for Seasons & Stars
 * Uses shared foundry-dev-tools configuration with custom TypeScript setup
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // Base JS rules
  eslint.configs.recommended,

  // TypeScript rules for TS files without project
  ...tseslint.configs.recommended,

  // Custom Foundry VTT configuration
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Core Foundry globals
        game: 'readonly',
        canvas: 'readonly',
        ui: 'readonly',
        Hooks: 'readonly',
        CONFIG: 'readonly',
        foundry: 'readonly',

        // Template functions
        renderTemplate: 'readonly',
        loadTemplates: 'readonly',

        // Application classes
        Dialog: 'readonly',
        Application: 'readonly',
        FormApplication: 'readonly',
        DocumentSheet: 'readonly',
        ActorSheet: 'readonly',
        ItemSheet: 'readonly',

        // Document classes
        JournalEntry: 'readonly',
        User: 'readonly',
        Folder: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        Scene: 'readonly',
        Playlist: 'readonly',
        Macro: 'readonly',

        // Additional common globals
        CONST: 'readonly',
        duplicate: 'readonly',
        mergeObject: 'readonly',
        setProperty: 'readonly',
        getProperty: 'readonly',
        hasProperty: 'readonly',
        expandObject: 'readonly',
        flattenObject: 'readonly',
        isObjectEmpty: 'readonly',
      },
    },
    rules: {
      // Custom rules for FoundryVTT modules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',

      // TypeScript-specific relaxed rules for Foundry development
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // TypeScript-specific config for .ts files with explicit project path
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Project-specific overrides for source files
  {
    files: ['packages/core/src/**/*.{js,ts}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
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
