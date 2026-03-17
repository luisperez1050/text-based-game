import { test } from '@playwright/test';
import { veraSnapshot } from '@vera-ci/playwright-reporter';

/**
 * High-frequency load test for VERA dashboard ingestion.
 * Runs 1,000 dummy tests in parallel to stress-test rate limiting / data dropping.
 *
 * Run locally with high parallelism:
 *   npm run test:load-ingestion
 *   # or: npx playwright test tests/load-test-ingestion.spec.ts --workers=32
 *
 * Start your app first: npm run dev
 */

const NUM_DUMMY_TESTS = 1000;

test.describe.configure({ mode: 'parallel' });

for (let i = 0; i < NUM_DUMMY_TESTS; i++) {
  test(`dummy-#${i}`, async ({ page }) => {
    test.skip(!!process.env.CI, 'Load test - run locally with npm run test:load-ingestion');
    await page.goto('/');
    await veraSnapshot(page, `load-test-ingestion-${i}`);
  });
}
