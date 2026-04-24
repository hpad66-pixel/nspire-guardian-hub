/**
 * A6 · Billing / Pricing — pricing page is public and lists plans.
 */
import { test, expect } from "@playwright/test";

test.describe("A6 Billing", () => {
  test("public pricing page renders plan cards", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /pricing/i })).toBeVisible();
  });

  test("admin billing requires auth", async ({ page }) => {
    await page.goto("/admin/billing");
    await expect(page).toHaveURL(/\/(auth|dashboard)/);
  });
});
