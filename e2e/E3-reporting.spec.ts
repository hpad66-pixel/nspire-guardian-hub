import { test, expect } from "@playwright/test";

test.describe("E3 Reporting", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/reports/procore");
    await expect(page).toHaveURL(/\/auth/);
  });
});
