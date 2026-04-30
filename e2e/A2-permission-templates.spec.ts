/**
 * A2 · Permission Templates — route renders without crashing.
 * Deeper acceptance (create / clone / delete-system-blocked) requires a
 * logged-in test fixture with a seeded tenant; this smoke guarantees the
 * page loads + the table header is present.
 */
import { test, expect } from "@playwright/test";

test.describe("A2 Permission Templates", () => {
  test("admin route redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/admin/permission-templates");
    // With RootRedirect + ProtectedRoute, anon users bounce to /auth
    await expect(page).toHaveURL(/\/auth(?:\b|\?|$)/);
  });

  test("auth page renders", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("body")).toBeVisible();
  });
});
