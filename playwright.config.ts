import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */

  reporter: [['html', { open: "never" }], ['@vera-ci/playwright-reporter',       {
        // Reads from VERA_API_KEY env var by default
        uploadTraces: true,
        uploadVideos: true,
      },]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    // Use the Vercel URL if it exists, otherwise fallback to localhost
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: "on",
    headless: true, // Always headless for CI, and generally good for Playwright tests
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }, // BaseURL inherited from top-level 'use'
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }, // BaseURL inherited from top-level 'use'
    },
    {
      name: 'Tablet Chrome',
      use: { ...devices['Pixel 2 XL'] }, // BaseURL inherited from top-level 'use'
    },
  ],

});
