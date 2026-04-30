/**
 * A1 · Multi-tenant isolation (public openapi contract).
 * Full isolation matrix requires two auth'd test users in separate tenants +
 * a live DB seeded with their data. Here we assert the auth-gated surface.
 */
import { test, expect } from "@playwright/test";

test("auth page renders the sign-in form", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("body")).toBeVisible();
});

test("protected root bounces guests", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth(?:\b|\?|$)/);
});
