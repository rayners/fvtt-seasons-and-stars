import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: '.',
  
  // Global test timeout
  timeout: 60000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },
  
  // Run tests in sequence to avoid world conflicts
  fullyParallel: false,
  workers: 1,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/headless-report' }],
    ['junit', { outputFile: 'test-results/headless-results.xml' }]
  ],
  
  // Output configuration
  outputDir: 'test-results/headless-artifacts',
  
  use: {
    // Foundry testing specific settings
    baseURL: 'http://localhost:30000',
    
    // Browser settings
    headless: true,
    
    // Capture traces and screenshots on failure
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    // Network settings for Foundry
    ignoreHTTPSErrors: true,
    
    // Wait for network to be idle (important for Foundry module loading)
    waitForLoadState: 'networkidle',
    
    // Extended timeouts for Foundry's heavy loading
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },

  projects: [
    {
      name: 'foundry-headless-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Foundry needs a larger viewport for proper widget positioning
        viewport: { width: 1920, height: 1080 }
      },
    },
  ],

  // Local dev server (if needed for Foundry management)
  webServer: process.env.CI ? undefined : {
    command: 'echo "Assuming Foundry is running on localhost:30000"',
    port: 30000,
    reuseExistingServer: true,
    timeout: 5000,
  },
};

export default config;