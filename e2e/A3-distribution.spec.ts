import { test, expect } from "@playwright/test";

test.describe("A3 Distribution Lists", () => {
  test("distribution list route redirects guests", async ({ page }) => {
    await page.goto("/settings/distribution-lists");
    await expect(page).toHaveURL(/\/auth/);
  });
});
