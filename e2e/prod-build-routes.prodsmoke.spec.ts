/**
 * Prod-build route smoke.
 *
 * Guards the failure that shipped the vendor payment ledger: a lazy route that
 * builds green, passes the dev-server e2e suite, and then crashes in production
 * with "Cannot read properties of undefined (reading 'default')" because the
 * rollup chunk graph — not the dev module graph — is what users load.
 *
 * These run against `vite preview` over `dist`, with Supabase stubbed, so they
 * need no credentials and never skip. If a route can't mount in the shipped
 * bundle, CI goes red instead of production.
 */
import { test, expect } from "@playwright/test";
import { bootAuthedProdApp, collectLazyChunkErrors, CRASH_TEXT, SEED } from "./fixtures/prodStub";

const PROJECT_ID = SEED.projectId;
const COMMITMENT_ID = SEED.commitmentId;

/**
 * Lazy routes worth guarding — the financial detail pages that have broken before.
 *
 * `expect` is the crucial part: without asserting on real page content, a route
 * that only renders the app shell (sidebar + spinner) counts as "passing" and
 * the guard silently protects nothing.
 */
const ROUTES: { name: string; path: string; expect: RegExp }[] = [
  { name: "dashboard", path: "/dashboard", expect: /dashboard|command center/i },
  { name: "project detail", path: `/projects/${PROJECT_ID}`, expect: /E2E Project/i },
  { name: "commitments list", path: `/projects/${PROJECT_ID}/financials/commitments`, expect: /commitments/i },
  {
    name: "commitment detail",
    path: `/projects/${PROJECT_ID}/financials/commitments/${COMMITMENT_ID}`,
    expect: new RegExp(SEED.vendorName, "i"),
  },
  {
    name: "commitment detail · payments tab",
    path: `/projects/${PROJECT_ID}/financials/commitments/${COMMITMENT_ID}?tab=payments`,
    expect: new RegExp(SEED.vendorName, "i"),
  },
  { name: "payments", path: `/projects/${PROJECT_ID}/financials/payments`, expect: /payments/i },
  { name: "pay apps", path: `/projects/${PROJECT_ID}/financials/pay-apps`, expect: /pay app/i },
  { name: "prime contract", path: `/projects/${PROJECT_ID}/financials/prime-contract`, expect: /contract/i },
  { name: "change orders", path: `/projects/${PROJECT_ID}/financials/change-orders`, expect: /change order/i },
];

test.describe("production bundle mounts every high-risk route", () => {
  for (const route of ROUTES) {
    test(`${route.name} renders without a chunk/lazy failure`, async ({ page }) => {
      const lazyErrors = collectLazyChunkErrors(page);
      await bootAuthedProdApp(page);

      await page.goto(route.path);

      // Real route content — not just the shell. Stubbed data makes this
      // deterministic, and it's what stops the guard degrading into a no-op.
      await expect(page.locator("#root")).toContainText(route.expect, { timeout: 20_000 });

      // Never the ErrorBoundary.
      await expect(page.getByText(CRASH_TEXT)).toHaveCount(0);

      // …and never the production-only lazy-import signature, even if the
      // boundary happened to recover.
      expect(lazyErrors, `lazy/chunk errors on ${route.path}:\n${lazyErrors.join("\n")}`).toEqual([]);

      // We must not have been bounced to auth — that would mean the stub failed
      // and the route was never actually exercised.
      expect(new URL(page.url()).pathname, "auth stub failed — route not exercised").not.toMatch(/^\/auth/);
    });
  }
});
