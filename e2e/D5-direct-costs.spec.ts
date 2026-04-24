import { test, expect } from "@playwright/test";

test.describe("D5 Direct Costs", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/direct-costs");
    await expect(page).toHaveURL(/\/auth/);
  });
});
