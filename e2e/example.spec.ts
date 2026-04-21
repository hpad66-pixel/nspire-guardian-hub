import { test, expect } from '@playwright/test';

// Placeholder spec — replace with prompt-specific acceptance tests.
// Each prompt's ACCEPTANCE TESTS become individual test() blocks in e2e/<prompt-id>.spec.ts
test('app loads without crashing', async ({ page }) => {
  await page.goto('/');
  await expect(page).not.toHaveTitle(/error/i);
});
