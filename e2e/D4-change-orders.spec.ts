import { test, expect } from "@playwright/test";

test.describe("D4 Change Orders", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/change-orders");
    await expect(page).toHaveURL(/\/auth/);
  });
});
