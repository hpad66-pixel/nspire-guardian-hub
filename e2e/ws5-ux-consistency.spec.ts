import { test, expect } from "@playwright/test";

/**
 * WS-5 · UX & consistency.
 * Repo e2e convention: unauthenticated smoke that the affected routes are
 * mounted and auth-gated. Behavioural fixes are covered closer to the unit:
 *  #5  usePhotos workspace resolution + current_tenant_id fallback migration
 *  #13 notification triggers (migration)
 *  #14 isActiveProject — src/lib/__tests__/projects.test.ts
 *  #15/#16/#17 confirm dialogs / responsive dialog / conditional PortalLink
 *  #18 Settings defers tab queries (shell paints immediately)
 */
const PROJECT = "/projects/00000000-0000-0000-0000-000000000000";

test.describe("WS-5 ux & consistency", () => {
  test("settings route is mounted and auth-gated (#18)", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("projects dashboard route is mounted and auth-gated (#14)", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("project gallery route is mounted and auth-gated (#5)", async ({ page }) => {
    await page.goto(`${PROJECT}/photos`);
    await expect(page).toHaveURL(/\/auth/);
  });
});
