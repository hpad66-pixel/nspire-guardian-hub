import { test as baseTest, expect } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

baseTest.describe("Client-scoped portals — unauth", () => {
  baseTest("any portal slug still requires a signed-in client", async ({ page }) => {
    await page.goto("/portal/r4-capital");
    await expect(page.getByRole("heading", { name: /clarity without the clutter|portal unavailable/i })).toBeVisible();
  });
});

authTest.describe("Client-scoped portals — staff", () => {
  authTest("project client portal tab exposes setup or the live link", async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}?tab=client-portal`);
    await expect(authed.getByRole("heading", { name: /client portal/i }).first()).toBeVisible({ timeout: 15_000 });
    const setup = authed.getByTestId("client-portal-setup");
    const preview = authed.getByRole("button", { name: /preview/i }).first();
    const hasSetup = await setup.isVisible().catch(() => false);
    const hasPreview = await preview.isVisible().catch(() => false);
    expect(hasSetup || hasPreview).toBeTruthy();
  });

  authTest("owner portal preview keeps a project tab strip or single project", async ({ authed, seeds }) => {
    await authed.goto(`/owner-portal/projects/${seeds.projectId}`);
    await expect(authed).toHaveURL(/\/owner-portal\/projects\//, { timeout: 15_000 });
    const tabs = authed.getByTestId("owner-portal-project-tabs");
    const single = authed.getByTestId("owner-portal-single-project");
    const hasTabs = await tabs.isVisible().catch(() => false);
    const hasSingle = await single.isVisible().catch(() => false);
    expect(hasTabs || hasSingle).toBeTruthy();
  });
});
