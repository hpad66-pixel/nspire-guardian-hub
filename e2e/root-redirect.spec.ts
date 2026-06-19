/**
 * RootRedirect · `/` shows the public landing page for guests and redirects
 * authenticated users to /dashboard (see src/pages/RootRedirect.tsx).
 */
import { test, expect } from "@playwright/test";

test("root shows the landing page for guests (no redirect to /auth)", async ({ page }) => {
  const resp = await page.goto("/");
  expect(resp).toBeTruthy();
  // Guests stay on the marketing landing at "/", they are NOT bounced to /auth.
  await expect(page).not.toHaveURL(/\/auth(?:\b|\?|$)/);
  await expect(page.locator("body")).toBeVisible();
});

test("legacy /landing still works if accessed directly", async ({ page }) => {
  await page.goto("/landing");
  // The marketing page uses the dark APAS theme; just assert it rendered something.
  await expect(page.locator("body")).toBeVisible();
});
