import { test, expect } from "@playwright/test";

/**
 * Smoke gates for consulting invoice + CRM project team routes.
 * Authenticated flows are covered by Vitest; these ensure routes resolve.
 */
test.describe("consulting invoice + CRM team", () => {
  test("client invoices financial route redirects unauthenticated users", async ({ page }) => {
    await page.goto("/projects/demo/financials/client-invoices");
    await expect(page).toHaveURL(/login|auth|sign/i);
  });

  test("contacts page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page).toHaveURL(/login|auth|sign/i);
  });
});
