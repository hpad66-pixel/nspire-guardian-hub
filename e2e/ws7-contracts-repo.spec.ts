import { test, expect } from "@playwright/test";

/**
 * WS-7 · Contracts & Repository hardening.
 *
 * Covers the two acceptance flows:
 *   - upload + download an artifact (Repository)
 *   - create a contract SOV line with a cost code (Contracts)
 *
 * Repo e2e convention (see ws4-discoverability.spec.ts): without seeded auth
 * these are unauthenticated smoke tests asserting the destination routes are
 * mounted and auth-gated. The authenticated bodies below are gated behind
 * E2E_AUTH so they can be fleshed out once a seeded session is available,
 * without failing CI in the meantime.
 */
const AUTHED = !!process.env.E2E_AUTH;

test.describe("WS-7 contracts & repository", () => {
  test("repository route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/repository");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("contracts route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/contracts");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("new-contract route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/contracts/new");
    await expect(page).toHaveURL(/\/auth/);
  });

  test.describe("authenticated flows", () => {
    test.skip(!AUTHED, "requires a seeded session (set E2E_AUTH=1)");

    test("upload then download an artifact", async ({ page }) => {
      await page.goto("/projects/seed/repository");
      await page.getByRole("button", { name: /upload/i }).first().click();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "ws7-artifact.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 ws7 test artifact"),
      });
      await page.getByLabel(/title/i).fill("WS7 Test Artifact");
      await page.getByRole("button", { name: /^upload|save$/i }).click();

      // Row appears in the list…
      const row = page.getByText("WS7 Test Artifact");
      await expect(row).toBeVisible();

      // …and opening it yields a (signed) download URL.
      await row.click();
      await expect(page.getByRole("link", { name: /download/i })).toBeVisible();
    });

    test("create a contract SOV line with a cost code", async ({ page }) => {
      await page.goto("/projects/seed/contracts/new");
      await page.getByLabel(/contract title/i).fill("WS7 Cost-Code Contract");

      await page.getByRole("button", { name: /add line item/i }).click();
      const row = page.locator("table tbody tr").first();
      await row.locator('input').nth(1).fill("Sewer main"); // description
      // Pick a cost code from the SOV row's Cost Code select.
      await row.getByRole("combobox").click();
      await page.getByRole("option").first().click();

      await page.getByRole("button", { name: /create contract/i }).click();

      // Dashboard renders the saved SOV line.
      await expect(page.getByText("Sewer main")).toBeVisible();
    });
  });
});
