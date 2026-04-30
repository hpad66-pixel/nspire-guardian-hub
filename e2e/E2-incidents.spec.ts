import { test, expect } from "@playwright/test";

test.describe("E2 Incidents", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/incidents");
    await expect(page).toHaveURL(/\/auth/);
  });
});
