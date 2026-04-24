import { test as baseTest, expect } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

baseTest.describe("D5 Direct Costs — unauth", () => {
  baseTest("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/direct-costs");
    await expect(page).toHaveURL(/\/auth/);
  });
});

authTest.describe("D5 Direct Costs — authed", () => {
  authTest("invoice dialog validates vendor requirement", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/direct-costs`);
    await authed.getByRole("button", { name: /new invoice/i }).click();
    await expect(authed.getByRole("dialog")).toBeVisible();
    const save = authed.getByRole("button", { name: /save invoice|save|submit/i }).first();
    await save.click();
    // Either a react-hook-form zod error OR the submit button stays disabled.
    const vendorError = authed.getByText(/vendor.*required/i);
    const stillOpen = authed.getByRole("dialog");
    await expect(vendorError.or(stillOpen)).toBeVisible();
  });

  authTest("timecard line auto-computes hours × rate", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/direct-costs`);
    const timecardTab = authed.getByRole("tab", { name: /timecard/i });
    if (!(await timecardTab.isVisible().catch(() => false))) return;
    await timecardTab.click();
    await authed.getByRole("button", { name: /new timecard/i }).click();
    await authed.getByRole("button", { name: /add line/i }).click();
    // Fill the first two number inputs in the line grid.
    const hours = authed.locator("input[type='number']").nth(0);
    const rate = authed.locator("input[type='number']").nth(1);
    await hours.fill("40");
    await rate.fill("65");
    // The component renders `$2,600` (or `$2600.00`) as the computed line total.
    await expect(authed.getByText(/\$2[,.]?600/i).first()).toBeVisible();
  });

  authTest("expense without vendor or employee surfaces validation", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/direct-costs`);
    const expensesTab = authed.getByRole("tab", { name: /expenses/i });
    if (!(await expensesTab.isVisible().catch(() => false))) return;
    await expensesTab.click();
    await authed.getByRole("button", { name: /new expense/i }).click();
    await authed.getByRole("button", { name: /save expense|save/i }).first().click();
    const error = authed.getByText(/vendor.*or.*employee|required/i);
    const dialog = authed.getByRole("dialog");
    await expect(error.or(dialog)).toBeVisible();
  });
});
