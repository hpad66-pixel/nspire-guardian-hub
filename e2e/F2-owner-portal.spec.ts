import { test, expect } from "@playwright/test";

test.describe("F2 Owner Portal", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/portal/owner");
    await expect(page).toHaveURL(/\/auth/);
  });
});
