/**
 * RootRedirect · / redirects to /auth for guests.
 */
import { test, expect } from "@playwright/test";

test("root redirects guests to /auth", async ({ page }) => {
  const resp = await page.goto("/");
  await expect(page).toHaveURL(/\/auth(?:\b|\?|$)/);
  expect(resp).toBeTruthy();
});

test("legacy /landing still works if accessed directly", async ({ page }) => {
  await page.goto("/landing");
  // The marketing page uses dark APAS theme; just assert it rendered something.
  await expect(page.locator("body")).toBeVisible();
});
