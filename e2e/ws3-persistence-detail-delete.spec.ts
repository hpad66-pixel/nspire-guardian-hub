import { test, expect } from "@playwright/test";

/**
 * WS-3 · Persistence, detail views, delete.
 * Repo e2e convention: unauthenticated smoke that the routes hosting the
 * affected tabs (progress, procurement, submittals, punch, change orders,
 * safety, meetings) are mounted and auth-gated. Hook-level behaviour
 * (stat invalidation, delete/void) is covered in
 * src/hooks/__tests__/ws3-persistence-delete.test.tsx.
 */
const PROJECT = "/projects/00000000-0000-0000-0000-000000000000";

test.describe("WS-3 persistence / detail / delete", () => {
  // #4 progress tiles, #12 PO stats, #10 submittals, #11 punch, #19 deletes
  // all live under the project workspace tabs.
  test("project workspace route is mounted and auth-gated", async ({ page }) => {
    await page.goto(`${PROJECT}/schedule`);
    await expect(page).toHaveURL(/\/auth/);
  });

  test("punch list route is mounted and auth-gated", async ({ page }) => {
    await page.goto(`${PROJECT}/punch-list`);
    await expect(page).toHaveURL(/\/auth/);
  });

  test("change orders route is mounted and auth-gated", async ({ page }) => {
    await page.goto(`${PROJECT}/financial/change-orders`);
    await expect(page).toHaveURL(/\/auth/);
  });
});
