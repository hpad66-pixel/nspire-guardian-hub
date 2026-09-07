/**
 * Auth0 Universal Login bridge.
 *
 * The e2e build runs with VITE_AUTH0_ENABLED unset, so these specs cover the
 * two things that hold regardless of the flag: the flag-off path is unchanged,
 * and the callback route refuses anything that is not a session the bridge
 * minted. Exercising a real Universal Login round trip needs an Auth0 test
 * tenant with a seeded user — see docs/auth0-setup.md, "What to verify".
 */
import { test, expect } from "@playwright/test";

test("callback route rejects a request carrying no minted session", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/auth\?error=sign_in_failed/);
});

test("callback route rejects a half-populated fragment", async ({ page }) => {
  // An access token with no refresh token is not a session; it must not be
  // handed to the Supabase client.
  await page.goto("/auth/callback#access_token=forged");
  await expect(page).toHaveURL(/\/auth\?error=sign_in_failed/);
});

test("callback scrubs the session out of the address bar", async ({ page }) => {
  await page.goto("/auth/callback#access_token=a&refresh_token=b");
  // The page replaces its own history entry before doing anything else, so the
  // tokens are gone whether or not the session turns out to be valid.
  await expect.poll(() => page.url()).not.toContain("access_token");
  expect(page.url()).not.toContain("refresh_token");
});

test("a bridge failure lands the user back on a usable sign-in page", async ({ page }) => {
  await page.goto("/auth?error=state_expired&message=That%20sign-in%20link%20expired.");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("email and password remain available while the flag is off", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with apas id/i })).toHaveCount(0);
});
