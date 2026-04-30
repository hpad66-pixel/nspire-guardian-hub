import { test, expect } from "@playwright/test";

test.describe("C2 Submittals", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/specifications");
    await expect(page).toHaveURL(/\/auth/);
  });
});
