import { test, expect } from "@playwright/test";

test.describe("A7 SSO / SAML / SCIM", () => {
  test("sso admin requires auth", async ({ page }) => {
    await page.goto("/admin/sso");
    await expect(page).toHaveURL(/\/auth/);
  });
  test("scim admin requires auth", async ({ page }) => {
    await page.goto("/admin/scim");
    await expect(page).toHaveURL(/\/auth/);
  });
});
