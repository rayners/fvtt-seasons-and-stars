import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./packages/core/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/packages/core/test/fixtures/**', // Exclude downloaded game system test files
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'packages/core/test/',
        'dist/',
        '**/*.d.ts',
        '*.config.*',
        'packages/core/docs/',
        'packages/core/templates/',
        'packages/core/src/styles/',
        'packages/core/calendars/',
        'languages/',
        'packages/core/scripts/',
        'packages/core/src/quench-tests.ts', // Quench integration tests (not unit tests)
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
