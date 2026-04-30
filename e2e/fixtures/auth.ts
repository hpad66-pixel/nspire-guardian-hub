/**
 * Shared auth fixture for acceptance e2e tests.
 *
 * Tests that hit authenticated routes use the `authed` fixture below, which
 * logs in with credentials from env vars and returns a logged-in `Page`.
 * When those env vars are absent (local dev without Supabase seed, or a PR
 * that only runs the unauth smoke suite) the fixture skips the test so the
 * whole run stays green rather than erroring out.
 *
 * Required environment:
 *   E2E_TEST_EMAIL       — test user's email
 *   E2E_TEST_PASSWORD    — test user's password
 *   E2E_SEEDED_PROJECT_ID — UUID of a project seeded for this user
 *   E2E_SEEDED_COMMITMENT_ID, E2E_SEEDED_CHANGE_EVENT_ID, …
 *     — optional per-prompt seeds; individual specs check what they need.
 *
 * CI workflow sets all of these when a `main` merge fires; PRs can opt-in
 * by setting them as repository secrets.
 */
import { test as base, expect, type Page } from "@playwright/test";

export interface SeedIds {
  projectId: string;
  commitmentId?: string;
  changeEventId?: string;
  changeOrderId?: string;
  payAppId?: string;
  submittalId?: string;
  rfiId?: string;
  ocoId?: string;
}

export interface AuthFixtures {
  authed: Page;
  seeds: SeedIds;
}

function readSeedIds(): SeedIds | null {
  const projectId = process.env.E2E_SEEDED_PROJECT_ID;
  if (!projectId) return null;
  return {
    projectId,
    commitmentId: process.env.E2E_SEEDED_COMMITMENT_ID,
    changeEventId: process.env.E2E_SEEDED_CHANGE_EVENT_ID,
    changeOrderId: process.env.E2E_SEEDED_CHANGE_ORDER_ID,
    payAppId: process.env.E2E_SEEDED_PAY_APP_ID,
    submittalId: process.env.E2E_SEEDED_SUBMITTAL_ID,
    rfiId: process.env.E2E_SEEDED_RFI_ID,
    ocoId: process.env.E2E_SEEDED_OCO_ID,
  };
}

async function loginWithForm(page: Page, email: string, password: string) {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Wait for either the dashboard or an explicit auth-redirect away from /auth
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 15_000 });
}

export const test = base.extend<AuthFixtures>({
  authed: async ({ page }, run) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    if (!email || !password) {
      test.skip(true, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — acceptance test skipped.");
      return;
    }
    await loginWithForm(page, email, password);
    await run(page);
  },

  seeds: async ({}, run) => {
    const seeds = readSeedIds();
    if (!seeds) {
      test.skip(true, "E2E_SEEDED_PROJECT_ID not set — acceptance test skipped.");
      return;
    }
    await run(seeds);
  },
});

export { expect };
