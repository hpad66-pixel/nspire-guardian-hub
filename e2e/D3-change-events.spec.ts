import { test, expect } from "@playwright/test";

test.describe("D3 Change Events", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/change-events");
    await expect(page).toHaveURL(/\/auth/);
  });
});
