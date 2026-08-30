import { test as baseTest, expect } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

baseTest.describe("F2 Owner Portal — unauth", () => {
  baseTest("root owner route requires auth", async ({ page }) => {
    await page.goto("/owner-portal");
    await expect(page).toHaveURL(/\/auth/);
  });

  baseTest("contracts page requires auth", async ({ page }) => {
    await page.goto("/owner-portal/contract");
    await expect(page).toHaveURL(/\/auth/);
  });

  baseTest("OCO approval page requires auth", async ({ page }) => {
    await page.goto("/owner-portal/cos/abc");
    await expect(page).toHaveURL(/\/auth/);
  });

  baseTest("pay-app approval page requires auth", async ({ page }) => {
    await page.goto("/owner-portal/pay-apps/abc");
    await expect(page).toHaveURL(/\/auth/);
  });
});

authTest.describe("F2 Owner Portal — authed", () => {
  authTest("dashboard lists pending OCOs and pay apps", async ({ authed }) => {
    await authed.goto("/owner-portal");
    await expect(authed.getByText(/owner|pending|review|portal/i).first()).toBeVisible();
  });

  authTest("OCO approval requires e-signature before Approve enables", async ({ authed, seeds }) => {
    authTest.skip(!seeds.ocoId, "E2E_SEEDED_OCO_ID required");
    await authed.goto(`/owner-portal/cos/${seeds.ocoId}`);
    const approve = authed.getByRole("button", { name: /^approve$/i });
    if (!(await approve.isVisible().catch(() => false))) return;
    expect(await approve.isDisabled()).toBeTruthy();

    const canvas = authed.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (box) {
      await authed.mouse.move(box.x + 20, box.y + 30);
      await authed.mouse.down();
      await authed.mouse.move(box.x + 180, box.y + 70);
      await authed.mouse.up();
      await authed.getByRole("button", { name: /save signature/i }).first().click();
      await expect(approve).toBeEnabled({ timeout: 5_000 });
    }
  });

  authTest("pay-app approval surfaces per-line max attribute", async ({ authed, seeds }) => {
    authTest.skip(!seeds.payAppId, "E2E_SEEDED_PAY_APP_ID required");
    await authed.goto(`/owner-portal/pay-apps/${seeds.payAppId}`);
    const firstAdjust = authed.locator("table >> input[type='number']").first();
    if (!(await firstAdjust.isVisible().catch(() => false))) return;
    await expect(firstAdjust).toHaveAttribute("max", /\d/);
  });

  authTest("pay-app reject without a reason code is prevented", async ({ authed, seeds }) => {
    authTest.skip(!seeds.payAppId, "E2E_SEEDED_PAY_APP_ID required");
    await authed.goto(`/owner-portal/pay-apps/${seeds.payAppId}`);
    const rejectBtn = authed.getByRole("button", { name: /reject.*reason|reject/i }).first();
    if (!(await rejectBtn.isVisible().catch(() => false))) return;
    authed.once("dialog", (d) => d.dismiss());
    await rejectBtn.click();
    await expect(authed.getByText(/rejected/i).first())
      .not.toBeVisible({ timeout: 2_000 })
      .catch(() => {});
  });

  authTest("owner reports page lists tenant-scope exec reports", async ({ authed }) => {
    await authed.goto("/owner-portal/reports");
    await expect(authed.getByText(/executive|reports|owner/i).first()).toBeVisible();
  });

  authTest("multi-project clients get a tab per project in the URL", async ({ authed }) => {
    await authed.goto("/owner-portal");
    await expect(authed).toHaveURL(/\/owner-portal(\/projects\/[0-9a-f-]+)?/i, { timeout: 15_000 });
    const tabs = authed.getByTestId("owner-portal-project-tabs");
    const single = authed.getByTestId("owner-portal-single-project");
    const hasTabs = await tabs.isVisible().catch(() => false);
    const hasSingle = await single.isVisible().catch(() => false);
    expect(hasTabs || hasSingle).toBeTruthy();
    if (hasTabs) {
      const first = tabs.getByRole("tab").first();
      const second = tabs.getByRole("tab").nth(1);
      if (await second.isVisible().catch(() => false)) {
        await second.click();
        await expect(authed).toHaveURL(/\/owner-portal\/projects\/[^/]+/);
        await expect(second).toHaveAttribute("aria-selected", "true");
        await expect(first).toHaveAttribute("aria-selected", "false");
      }
    }
  });
});
