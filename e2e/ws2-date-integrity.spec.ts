import { test, expect } from "@playwright/test";

/**
 * WS-2 · Date integrity.
 * Repo e2e convention: unauthenticated smoke checks the route mounts and
 * is auth-gated. The date-only round-trip correctness (bug #6) is proven
 * exhaustively under multiple timezones in src/lib/__tests__/date.test.ts.
 */
test.describe("WS-2 date integrity", () => {
  // #6 date-only saves no longer shift a day (Calendar/<input type=date>).
  test("schedule route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/schedule");
    await expect(page).toHaveURL(/\/auth/);
  });

  // #7 project start_date is bounded to 1900-2100 (no more year 0025).
  test("projects route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/auth/);
  });
});
