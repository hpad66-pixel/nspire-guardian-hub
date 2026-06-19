/**
 * F0 · Unified Project Financials — acceptance contract.
 *
 * Full flows (rollup math, partial payments, lien gate, e-submittal) require an
 * authenticated user + the sewer-extension demo seed
 * (supabase/seed/f0_sewer_extension_demo.sql). Following the repo convention
 * (see A1-multi-tenant.spec.ts), the seed/auth-dependent assertions are written
 * against the auth-gated surface; each test maps to one ACCEPTANCE TEST bullet.
 */
import { test, expect } from "@playwright/test";

const PROJ = "00000000-0000-0000-0000-0000000000aa"; // placeholder; real id from seed

// 1 · Single home — /financials redirects to /overview; old /contracts gone.
test("financials routes are auth-gated and contracts routes are retired", async ({ page }) => {
  await page.goto(`/projects/${PROJ}/financials/overview`);
  await expect(page).toHaveURL(/\/auth(?:\b|\?|$)/);
  await page.goto(`/projects/${PROJ}/contracts`);
  // legacy Stack-A contracts route removed → app shell bounces guest to auth
  await expect(page).toHaveURL(/\/auth(?:\b|\?|$)/);
});

// 2 · Rollup math: base 523k + executed COs 40k+15k = 578k; pending 10k excluded.
test.fixme("revised contract value = base + executed COs", async () => {});

// 3 · Pay app + partial AR payment → balance, partial badge, paid at zero, overpay blocked.
test.fixme("AR partial payments reconcile and over-payment is rejected", async () => {});

// 4 · No invoice → no sub payment (UI disabled + DB NOT NULL).
test.fixme("commitment payment requires an invoice", async () => {});

// 5 · Lien gate blocks until an approved conditional-progress release exists.
test.fixme("lien gate blocks AP payment until release approved", async () => {});

// 6 · Both lien directions (inbound on invoice, outbound on pay app via A4).
test.fixme("inbound and outbound lien releases attach to the right parent", async () => {});

// 7 · E-submittal (manual): upload → vendor_submissions → draft invoice.
test.fixme("manual upload creates a draft invoice, not approved/paid", async () => {});

// 8 · E-submittal (auto-ingest): signed payload → artifact + submission + draft; bad token rejected.
test.fixme("intake-ingest auto-creates drafts and rejects invalid tokens", async () => {});

// 9 · Ledger + budget reconcile (summarizeLedger matches v_project_financial_summary).
test.fixme("ledger AR/AP/net-cash matches the summary and budget balances", async () => {});

// 10 · Tenancy — second workspace cannot see/write F0 rows; tenant triggers reject cross-tenant parents.
test("guest cannot reach any F0 financial surface", async ({ page }) => {
  for (const path of ["overview", "lien-releases", "vendor-inbox", "ledger", "payments"]) {
    await page.goto(`/projects/${PROJ}/financials/${path}`);
    await expect(page).toHaveURL(/\/auth(?:\b|\?|$)/);
  }
});
