import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./packages/core/test/setup.ts'],
    include: ['packages/*/test/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/packages/core/test/fixtures/**', // Exclude downloaded game system test files
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'packages/core/src/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        'packages/*/test/',
        'dist/',
        '**/*.d.ts',
        '*.config.*',
        'packages/core/docs/',
        'packages/core/templates/',
        'packages/core/src/styles/',
        'packages/*/calendars/',
        'shared/',
        'packages/core/scripts/',
        'packages/core/src/quench-tests.ts', // Quench integration tests (not unit tests)
        'packages/fantasy-pack/**', // Data-only pack, no source code to cover
        'packages/scifi-pack/**', // Data-only pack, no source code to cover
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
