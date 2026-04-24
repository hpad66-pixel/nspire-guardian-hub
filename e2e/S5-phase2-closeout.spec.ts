/**
 * S5 · Phase-2 closeout — auth-redirect smoke for the new C2/E1 routes.
 */
import { test, expect } from "@playwright/test";

test.describe("S5 C2 submittal sub-pages", () => {
  test("packages page requires auth", async ({ page }) => {
    await page.goto("/projects/abc/submittals/packages");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("register page requires auth", async ({ page }) => {
    await page.goto("/projects/abc/submittals/register");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("S5 E1 schedule already auth-gated", () => {
  test("schedule page still requires auth", async ({ page }) => {
    await page.goto("/projects/abc/schedule");
    await expect(page).toHaveURL(/\/auth/);
  });
});
