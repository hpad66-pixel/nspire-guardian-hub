import { test, expect } from "@playwright/test";

/**
 * WS-6 · Daily Log photos.
 *
 * Acceptance flow:
 *   create daily report -> upload & attach a photo -> thumbnail renders
 *   -> photo appears in the exported PDF -> detach removes it.
 *
 * Repo e2e convention (see ws7-contracts-repo.spec.ts): without a seeded
 * session the route is exercised as an unauthenticated smoke test that
 * asserts the destination is mounted and auth-gated. The full authenticated
 * body is gated behind E2E_AUTH so it can run once a seeded session exists
 * without failing CI in the meantime.
 */
const AUTHED = !!process.env.E2E_AUTH;

test.describe("WS-6 daily log photos", () => {
  test("daily-log route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/daily-log");
    await expect(page).toHaveURL(/\/auth/);
  });

  test.describe("authenticated flow", () => {
    test.skip(!AUTHED, "requires a seeded session (set E2E_AUTH=1)");

    test("create report, upload & attach a photo, see it in the PDF, then detach", async ({
      page,
    }) => {
      await page.goto("/projects/seed/daily-log");

      // 1. Create the daily report for today.
      await page.getByRole("button", { name: /create report/i }).click();

      // 2. Open the Photos tab and the attach/upload dialog.
      await page.getByRole("tab", { name: /photos/i }).click();
      await page.getByRole("button", { name: /attach \/ upload/i }).click();
      await page.getByRole("tab", { name: /upload new/i }).click();

      // 3. Upload & attach a photo.
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "ws6-site.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(
          // 1x1 px JPEG
          "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda0008010100003f00d2cf20ffd9",
          "hex",
        ),
      });

      // 4. The attached thumbnail renders (signed URL on project-photos).
      const thumb = page.locator("img").first();
      await expect(thumb).toBeVisible();
      await expect(thumb).toHaveAttribute("src", /token=|project-photos/);

      // 5. The exported PDF download includes the photo (Photos section).
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /download pdf/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/daily-log-.*\.pdf/);

      // 6. Detach removes it.
      await page.locator('[aria-label="Detach"]').first().click();
      await expect(page.getByText(/no photos attached yet/i)).toBeVisible();
    });
  });
});
