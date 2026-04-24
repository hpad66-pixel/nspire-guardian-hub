import { test, expect } from "@playwright/test";

test.describe("D1 Prime Contract", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/prime-contract");
    await expect(page).toHaveURL(/\/auth/);
  });
});
