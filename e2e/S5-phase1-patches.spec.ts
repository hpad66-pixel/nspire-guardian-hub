/**
 * S5 · Phase-1 patches — auth-redirect smoke for new admin/project routes.
 */
import { test, expect } from "@playwright/test";

test.describe("S5 Phase-1 patch routes", () => {
  test("cost-code library editor requires auth", async ({ page }) => {
    await page.goto("/admin/cost-codes/editor");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("workflows admin requires auth", async ({ page }) => {
    await page.goto("/admin/workflows");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("project cost codes page requires auth", async ({ page }) => {
    await page.goto("/projects/abc/cost-codes");
    await expect(page).toHaveURL(/\/auth/);
  });
});
