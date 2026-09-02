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
  {
    // Carries the per-vendor payment ledger — the surface the D'SHIN
    // reconciliation is read from, so it must mount in the shipped bundle.
    name: "vendor dashboards",
    path: `/projects/${PROJECT_ID}/financials/vendors`,
    expect: new RegExp(SEED.vendorName, "i"),
  },
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

      if (route.name === "dashboard") {
        const overflow = await page.evaluate(() => {
          const html = document.documentElement;
          const body = document.body;
          const shell = document.querySelector(".apas-app-shell");
          const main = document.querySelector("[data-testid='app-main']");
          return {
            htmlY: getComputedStyle(html).overflowY,
            bodyY: getComputedStyle(body).overflowY,
            shellY: shell ? getComputedStyle(shell).overflowY : null,
            mainY: main ? getComputedStyle(main).overflowY : null,
          };
        });
        expect(["auto", "scroll", "visible"]).toContain(overflow.htmlY);
        expect(overflow.htmlY).not.toBe("clip");
        expect(overflow.bodyY).not.toBe("clip");
        expect(overflow.bodyY).not.toBe("hidden");
        expect(overflow.shellY).toBe("visible");
        expect(overflow.mainY).toBe("visible");
      }
    });
  }

  test("D'SHIN vendor dashboard renders the certified reconciliation control", async ({ page }) => {
    await bootAuthedProdApp(page);

    await page.goto(`/projects/${PROJECT_ID}/financials/vendors`);

    await expect(page.getByText("Paid to date", { exact: true }).locator("..")).toContainText("$540,479.39", { timeout: 20_000 });
    await expect(page.getByText(/Independently reconciled · QC checked/i)).toBeVisible();
    await expect(page.getByText(/36 payments? and 13 invoices?/i)).toBeVisible();
  });

  test("D'SHIN baseline adjustment renders its paid stamp and approved lien control", async ({ page }) => {
    await bootAuthedProdApp(page);

    await page.goto(
      `/projects/${PROJECT_ID}/financials/commitments/${COMMITMENT_ID}` +
      `?tab=invoices&invoice=${SEED.baselineAdjustmentInvoiceId}`,
    );

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("DSHIN-BASELINE-ADJ-2026-06-11", { timeout: 20_000 });
    await expect(dialog.getByRole("img", { name: /Processed and paid, \$8,293\.12/i })).toBeVisible();
    await expect(dialog).toContainText("JOINT-RECON-2026-06-11");
    await expect(dialog).toContainText("Gate satisfied — payment allowed.");
    await expect(dialog.getByRole("button", { name: "Record payment" })).toHaveCount(0);
  });
});
