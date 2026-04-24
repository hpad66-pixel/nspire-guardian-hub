import { test, expect } from "@playwright/test";

test.describe("A5 Cost Codes (WBS)", () => {
  test("admin cost codes route requires auth", async ({ page }) => {
    await page.goto("/admin/cost-codes");
    await expect(page).toHaveURL(/\/auth/);
  });
});
