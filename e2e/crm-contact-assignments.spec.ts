import { test, expect } from "@playwright/test";

/**
 * Contact ↔ project / property attach and scoped email recipients.
 * Unauthenticated smoke: the contacts and inbox compose routes stay mounted
 * and auth-gated. Assignment + recipient filter logic is covered in Vitest.
 */
test.describe("CRM contact assignments", () => {
  test("contacts route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("inbox compose route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/auth/);
  });
});
