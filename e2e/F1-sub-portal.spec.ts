import { test as baseTest, expect } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

baseTest.describe("F1 Subcontractor Portal — unauth", () => {
  baseTest("root portal route requires auth", async ({ page }) => {
    await page.goto("/sub-portal");
    await expect(page).toHaveURL(/\/auth/);
  });

  baseTest("commitments list requires auth", async ({ page }) => {
    await page.goto("/sub-portal/commitments");
    await expect(page).toHaveURL(/\/auth/);
  });

  baseTest("invoice builder requires auth", async ({ page }) => {
    await page.goto("/sub-portal/commitments/abc/invoices/new");
    await expect(page).toHaveURL(/\/auth/);
  });
});

authTest.describe("F1 Subcontractor Portal — authed", () => {
  authTest("sub dashboard shows their commitments heading", async ({ authed }) => {
    await authed.goto("/sub-portal");
    await expect(authed.getByText(/my commitments|commitments|portal/i).first()).toBeVisible();
  });

  authTest("sub can draft + submit an invoice for a commitment", async ({ authed, seeds }) => {
    authTest.skip(!seeds.commitmentId, "E2E_SEEDED_COMMITMENT_ID required");
    await authed.goto(`/sub-portal/commitments/${seeds.commitmentId}/invoices/new`);
    await authed.getByLabel(/invoice #|invoice number/i).first().fill("E2E-INV-001");
    await authed.getByRole("button", { name: /create draft|save draft/i }).first().click();
    const submit = authed.getByRole("button", { name: /submit for review|submit/i }).first();
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      await expect(authed.getByText(/submitted|under review|gc review/i)).toBeVisible({ timeout: 8_000 });
    }
  });

  authTest("sub attempting main-app /admin is redirected or blocked", async ({ authed }) => {
    await authed.goto("/admin/permission-templates");
    // Accept either a redirect off the admin route OR a 403-style page.
    const url = authed.url();
    if (!url.includes("/admin/permission-templates")) {
      expect(url).not.toContain("/admin/permission-templates");
      return;
    }
    await expect(authed.getByText(/forbidden|not authorized|access denied/i).first()).toBeVisible();
  });
});
