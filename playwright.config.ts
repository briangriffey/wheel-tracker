import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Visual Regression Testing
 *
 * This configuration sets up visual regression testing for the design system
 * components with screenshot comparison capabilities.
 */
export default defineConfig({
  // Test directory
  testDir: './tests/visual',

  // Maximum time one test can run
  timeout: 30000,

  // Expect timeout for assertions
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000,

    // Visual comparison settings
    toHaveScreenshot: {
      // Maximum allowed pixel difference (0-1, where 1 = 100%)
      maxDiffPixelRatio: 0.01,

      // Animation settings - disable animations for consistent screenshots
      animations: 'disabled',

      // CSS to apply to screenshots
      // Remove cursor and selection to avoid flaky tests
      stylePath: './tests/visual/screenshot-styles.css',
    },
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI ? [['html'], ['github']] : [['html'], ['list']],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers and viewports
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 12'],
        // Force Chromium instead of WebKit for mobile testing
        browserName: 'chromium',
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro'],
        // Force Chromium instead of WebKit for tablet testing
        browserName: 'chromium',
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
