import { test, expect } from "@playwright/test";

test.describe("D5 Direct Costs", () => {
  test("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/direct-costs");
    await expect(page).toHaveURL(/\/auth/);
  });

  // Acceptance flows require a logged-in fixture + seeded project. Marked skip
  // until auth fixture exists; remove .skip and swap <seeded> for a real uuid.
  test.skip("invoice dialog validates vendor requirement", async ({ page }) => {
    await page.goto("/projects/<seeded>/financials/direct-costs");
    await page.getByRole("button", { name: /new invoice/i }).click();
    await page.getByRole("button", { name: /save invoice/i }).click();
    await expect(page.getByText(/vendor is required/i)).toBeVisible();
  });

  test.skip("timecard auto-computes hours × rate", async ({ page }) => {
    await page.goto("/projects/<seeded>/financials/direct-costs");
    await page.getByRole("tab", { name: /timecards/i }).click();
    await page.getByRole("button", { name: /new timecard/i }).click();
    await page.getByRole("button", { name: /add line/i }).click();
    await page.getByPlaceholder(/0\.25/i).fill("40");
    await page.getByPlaceholder(/0\.01/i).fill("65");
    await expect(page.locator("text=$2,600")).toBeVisible();
  });

  test.skip("expense without vendor or employee is rejected", async ({ page }) => {
    await page.goto("/projects/<seeded>/financials/direct-costs");
    await page.getByRole("tab", { name: /expenses/i }).click();
    await page.getByRole("button", { name: /new expense/i }).click();
    await page.getByRole("button", { name: /save expense/i }).click();
    await expect(page.getByText(/requires either a vendor or an employee/i)).toBeVisible();
  });
});
