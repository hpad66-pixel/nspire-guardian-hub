import { test, expect } from "@playwright/test";

test.describe("B5 Documents + Transmittals", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/transmittals");
    await expect(page).toHaveURL(/\/auth/);
  });
});
