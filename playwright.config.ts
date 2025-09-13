import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for FoundryVTT Seasons & Stars Module
 * 
 * This configuration is optimized for testing FoundryVTT modules through
 * the Playwright MCP integration.
 */
export default defineConfig({
  testDir: './playwright-tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL for FoundryVTT instance */
    baseURL: 'http://localhost:30000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* FoundryVTT specific settings */
    ignoreHTTPSErrors: true,

    /* Wait for network idle since FoundryVTT loads many assets */
    waitForLoadState: 'networkidle',

    /* Larger viewport for FoundryVTT UI */
    viewport: { width: 1920, height: 1080 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  /* Run your local FoundryVTT server before starting the tests */
  webServer: {
    command: 'echo "Please ensure FoundryVTT is running on http://localhost:30000"',
    url: 'http://localhost:30000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for FoundryVTT to start
  },

  /* Global test timeout */
  timeout: 30 * 1000,
  
  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },
});