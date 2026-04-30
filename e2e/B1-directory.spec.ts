import { test, expect } from "@playwright/test";

test.describe("B1 Project Directory", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/directory");
    await expect(page).toHaveURL(/\/auth/);
  });
});
