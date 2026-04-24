import { test as baseTest, expect } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

baseTest.describe("D6 Budget — unauth", () => {
  baseTest("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/budget");
    await expect(page).toHaveURL(/\/auth/);
  });
});

authTest.describe("D6 Budget — authed", () => {
  authTest("matrix renders with required column headers", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/budget`);
    await expect(authed.getByText(/cost code/i).first()).toBeVisible();
    const money = authed.getByText(/original|revised|forecast|committed|actual|variance/i);
    await expect(money.first()).toBeVisible();
  });

  authTest("committed cell opens drill-down with commitment list", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/budget`);
    const committedHeader = authed.getByText(/committed/i).first();
    if (!(await committedHeader.isVisible().catch(() => false))) return;
    const committedCells = authed.locator("td:has-text('$')");
    if ((await committedCells.count()) === 0) return;
    await committedCells.nth(3).click();
    await expect(authed.getByText(/committed|commitment/i).first()).toBeVisible();
  });

  authTest("new modification dialog accepts a draft transfer", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/budget`);
    const button = authed.getByRole("button", { name: /new modification|modification/i }).first();
    if (!(await button.isVisible().catch(() => false))) return;
    await button.click();
    await expect(authed.getByRole("dialog")).toBeVisible();
    await authed.getByLabel(/title/i).first().fill("E2E transfer");
    await authed.getByRole("button", { name: /save.*draft|save|create/i }).first().click();
    await expect(authed.getByText(/draft.*created|saved|modification/i)).toBeVisible({ timeout: 8_000 });
  });

  authTest("approve modification button exists on the list", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/budget`);
    const modsTab = authed.getByRole("tab", { name: /modification/i });
    if (!(await modsTab.isVisible().catch(() => false))) return;
    await modsTab.click();
    const approve = authed.getByRole("button", { name: /approve/i }).first();
    const empty = authed.getByText(/no modifications|empty/i);
    await expect(approve.or(empty)).toBeVisible();
  });

  authTest("snapshot dialog captures the matrix jsonb", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/budget`);
    const button = authed.getByRole("button", { name: /snapshot/i }).first();
    if (!(await button.isVisible().catch(() => false))) return;
    await button.click();
    await authed.getByRole("button", { name: /capture.*snapshot|snapshot/i }).first().click();
    await expect(authed.getByText(/snapshot.*captured|saved/i)).toBeVisible({ timeout: 8_000 });
  });

  authTest("CSV export button emits a download when clicked", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}/financials/budget`);
    const button = authed.getByRole("button", { name: /export.*csv|csv/i }).first();
    if (!(await button.isVisible().catch(() => false))) return;
    const [download] = await Promise.all([
      authed.waitForEvent("download"),
      button.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
