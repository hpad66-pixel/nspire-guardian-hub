import { test, expect } from "@playwright/test";

test.describe("B2 Drawings", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/drawings");
    await expect(page).toHaveURL(/\/auth/);
  });
});
