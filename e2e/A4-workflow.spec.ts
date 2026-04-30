import { test, expect } from "@playwright/test";

test.describe("A4 Ball-in-Court Workflow Engine", () => {
  test("my court page requires auth", async ({ page }) => {
    await page.goto("/dashboard/my-court");
    await expect(page).toHaveURL(/\/auth/);
  });
});
