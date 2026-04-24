import { test, expect } from "@playwright/test";

test.describe("C4 Daily Log", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/daily-log");
    await expect(page).toHaveURL(/\/auth/);
  });
});
