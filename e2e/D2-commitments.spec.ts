import { test, expect } from "@playwright/test";

test.describe("D2 Commitments", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/commitments");
    await expect(page).toHaveURL(/\/auth/);
  });
});
