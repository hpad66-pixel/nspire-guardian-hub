import { test, expect } from "@playwright/test";

/**
 * WS-4 · Discoverability.
 * #8 Documents lives in the global sidebar (Insights); Directory is a
 *    project-scoped route. #9 global search adds RFIs/Submittals/Contacts/
 *    Documents groups with correct detail routes (unit-tested in
 *    src/lib/__tests__/global-search.test.ts).
 * Repo e2e convention: unauthenticated smoke that the destination routes
 * are mounted and auth-gated.
 */
test.describe("WS-4 discoverability", () => {
  test("documents route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/documents");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("contacts route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("project directory route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/directory");
    await expect(page).toHaveURL(/\/auth/);
  });
});
