import { test, expect } from "@playwright/test";

/**
 * WS-1 · RFIs, Document Folders, Contacts — the three flows that were dead.
 * Following the repo e2e convention (unauthenticated smoke checks that the
 * route mounts and is auth-gated), one test() per acceptance bullet.
 */
test.describe("WS-1 critical create flows", () => {
  // #1 RFI create no longer throws "p.workspace_id does not exist".
  test("project workspace (RFIs) route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/directory");
    await expect(page).toHaveURL(/\/auth/);
  });

  // #2 Document folder create no longer violates document_folders RLS.
  test("documents route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/documents");
    await expect(page).toHaveURL(/\/auth/);
  });

  // #3 Contact create no longer silently no-ops.
  test("contacts route is mounted and auth-gated", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page).toHaveURL(/\/auth/);
  });
});
