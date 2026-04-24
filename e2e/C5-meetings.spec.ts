import { test, expect } from "@playwright/test";

test.describe("C5 Meetings", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/meetings");
    await expect(page).toHaveURL(/\/auth/);
  });
});
