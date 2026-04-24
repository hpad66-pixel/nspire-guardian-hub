import { test, expect } from "@playwright/test";

test.describe("F1 Subcontractor Portal", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/portal/sub");
    await expect(page).toHaveURL(/\/auth/);
  });
});
