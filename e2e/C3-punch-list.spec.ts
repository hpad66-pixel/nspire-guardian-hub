import { test, expect } from "@playwright/test";

test.describe("C3 Punch List", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/punch");
    await expect(page).toHaveURL(/\/auth/);
  });
});
