/**
 * Prod-build render harness.
 *
 * The rest of the e2e suite runs against `npm run dev`, so it exercises Vite's
 * dev module graph — NOT the rollup bundle we actually ship. That blind spot is
 * real: a lazy route can import cleanly in dev and still fail in production,
 * where React.lazy reads `.default` off a module that resolved `undefined`
 * (see the vendor-payment-ledger incident). These helpers boot the *built*
 * bundle with a stubbed Supabase so protected routes genuinely mount.
 *
 * Nothing here talks to a real backend — every request is fulfilled locally, so
 * the suite needs no credentials and never skips.
 */
import type { Page, Route } from "@playwright/test";
import { dshinReconciliationV1 } from "../../src/test/fixtures/dshinReconciliation.v1";

/** Must match the dummy VITE_SUPABASE_URL used by `npm run build:e2e`. */
export const STUB_PROJECT_REF = "e2estub";
export const STUB_SUPABASE_URL = `https://${STUB_PROJECT_REF}.supabase.co`;
export const STUB_STORAGE_KEY = `sb-${STUB_PROJECT_REF}-auth-token`;

export const USER_ID = "00000000-0000-0000-0000-0000000000e2";

export const STUB_USER = {
  id: USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "e2e@example.com",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "E2E User" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export function stubSession() {
  return {
    access_token: "e2e-access-token",
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    // Far-future so supabase-js treats the session as valid and doesn't refresh.
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    expires_in: 60 * 60 * 24 * 365,
    user: STUB_USER,
  };
}

export const SEED = {
  projectId: "4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d",
  commitmentId: "7bce7dce-152d-49bf-ba13-899b9b4f04ad",
  invoiceId: "11111111-1111-4111-8111-000000000001",
  baselineAdjustmentInvoiceId: "11111111-1111-4111-8111-000000000011",
  vendorName: dshinReconciliationV1.vendor,
  commitmentNo: "SC-001",
};

const invoiceIdByNo = new Map(
  dshinReconciliationV1.invoices.map((invoice, index) => [
    invoice.invoiceNo,
    `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
  ]),
);

const invoiceRows = dshinReconciliationV1.invoices.map((invoice) => ({
  id: invoiceIdByNo.get(invoice.invoiceNo),
  tenant_id: "t1",
  commitment_id: SEED.commitmentId,
  invoice_no: invoice.invoiceNo,
  period_end: invoice.periodEnd,
  status: "paid",
  submitted_amount: invoice.amount,
  approved_amount: invoice.amount,
  retainage_held: 0,
  source_kind: invoice.classification === "bank_detail" ? "historical_bank_reconstruction" : "historical_exception",
  processed_at: `${invoice.periodEnd}T12:00:00Z`,
  paid_at: `${invoice.periodEnd}T12:00:00Z`,
  created_at: `${invoice.periodEnd}T12:00:00Z`,
  updated_at: `${invoice.periodEnd}T12:00:00Z`,
}));

const paymentRows = dshinReconciliationV1.entries.map((entry, index) => ({
  id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
  tenant_id: "t1",
  commitment_id: SEED.commitmentId,
  commitment_invoice_id: invoiceIdByNo.get(entry.invoiceNo),
  amount: entry.amount,
  paid_date: entry.paidDate,
  method: entry.method,
  reference: entry.reference,
  notes: "notes" in entry ? entry.notes : null,
  created_at: `${entry.paidDate}T12:00:00Z`,
}));

const lienReleaseRows = dshinReconciliationV1.invoices.map((invoice, index) => ({
  id: `44444444-4444-4444-8444-${String(index + 1).padStart(12, "0")}`,
  tenant_id: "t1",
  project_id: SEED.projectId,
  direction: "inbound",
  release_type: "unconditional_progress",
  status: "approved",
  commitment_invoice_id: invoiceIdByNo.get(invoice.invoiceNo),
  pay_app_id: null,
  amount: invoice.amount,
  through_date: invoice.periodEnd,
  claimant_name: SEED.vendorName,
  artifact_id: null,
  workflow_instance_id: null,
  created_at: `${invoice.periodEnd}T11:00:00Z`,
}));

/**
 * Just enough PostgREST data for the financial detail routes to render their
 * real content instead of a loading state. Keyed by table name so a route that
 * queries something new simply gets `[]` rather than breaking the harness.
 */
export const TABLE_ROWS: Record<string, unknown[]> = {
  // Module gating: AppLayout redirects financial routes to /portals when the
  // owning module is off. ModuleContext treats any field that isn't literally
  // `false` as enabled, so an empty row turns everything on.
  workspace_modules: [{ workspace_id: "w1" }],
  properties: [{
    id: "p1",
    name: "E2E Property",
    nspire_enabled: true,
    daily_grounds_enabled: true,
    projects_enabled: true,
    occupancy_enabled: true,
    qr_scanning_enabled: true,
  }],
  user_roles: [{ user_id: USER_ID, role: "admin" }],
  // Dates matter: the detail page formats them, and a null date throws
  // `RangeError: Invalid time value` — which this harness correctly catches.
  projects: [{
    id: SEED.projectId,
    name: "E2E Project",
    status: "active",
    description: "Seeded by the prod-build smoke harness.",
    budget: 0,
    spent: 0,
    property_id: null,
    client_id: null,
    parent_project_id: null,
    start_date: "2026-01-01",
    target_end_date: "2026-12-31",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }],
  commitments: [{
    id: SEED.commitmentId,
    project_id: SEED.projectId,
    commitment_no: SEED.commitmentNo,
    title: `${SEED.vendorName} — Sewer Extension`,
    commitment_type: "subcontract",
    status: "executed",
    original_value: 429510,
    retainage_pct: 5,
    vendor_org_id: null,
    executed_date: "2026-07-11",
    created_at: "2026-06-17T00:00:00Z",
  }],
  commitment_totals: [{
    commitment_id: SEED.commitmentId,
    original_value: 429510,
    executed_cco_value: 152817.69,
    revised_commitment_value: 582327.69,
    billed_to_date: dshinReconciliationV1.controls.certifiedTotal,
  }],
  change_orders: [{
    id: "33333333-3333-4333-8333-000000000001",
    tenant_id: "t1",
    project_id: SEED.projectId,
    commitment_id: SEED.commitmentId,
    prime_contract_id: null,
    co_no: 1,
    title: "Executed D'SHIN change orders",
    amount: 152817.69,
    status: "executed",
  }],
  commitment_invoices: invoiceRows,
  commitment_payments: paymentRows,
  lien_releases: lienReleaseRows,
  v_vendor_reconciliation_status: [{
    commitment_id: SEED.commitmentId,
    tenant_id: "t1",
    as_of_date: "2026-07-27",
    expected_paid_to_date: dshinReconciliationV1.controls.certifiedTotal,
    expected_payment_count: dshinReconciliationV1.controls.certifiedEntryCount,
    expected_invoice_count: dshinReconciliationV1.controls.reconstructedInvoiceCount,
    actual_paid_to_date: dshinReconciliationV1.controls.certifiedTotal,
    actual_payment_count: dshinReconciliationV1.controls.certifiedEntryCount,
    actual_invoice_count: dshinReconciliationV1.controls.reconstructedInvoiceCount,
    missing_reference_count: 0,
    variance: 0,
    is_reconciled: true,
    certified_at: "2026-08-06T12:00:00Z",
    control_note: "35 Wells Fargo statement-detail payments plus one separately identified jointly agreed baseline adjustment.",
  }],
};

/** `/rest/v1/commitment_totals?select=...` → `commitment_totals` */
export function tableFromUrl(url: string): string {
  const m = /\/rest\/v1\/([A-Za-z0-9_]+)/.exec(url);
  return m ? m[1] : "";
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });

/**
 * Seed a session and intercept every Supabase call so protected routes mount.
 * Data is deliberately empty — we are asserting the route *renders*, not what
 * it renders. A page that crashes on load fails long before data matters.
 */
export async function bootAuthedProdApp(page: Page) {
  await page.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key as string, JSON.stringify(session));
      // Skip the one-time SW eviction reload so the very first load is the app.
      window.localStorage.setItem("proj-os-sw-cleanup", "e2e");
    },
    [STUB_STORAGE_KEY, stubSession()] as const,
  );

  // Runtime config endpoint is a Cloudflare Function that doesn't exist locally.
  await page.route("**/api/app-config", (route) =>
    json(route, { supabaseUrl: STUB_SUPABASE_URL, supabasePublishableKey: "e2e-anon-key" }),
  );

  await page.route(`${STUB_SUPABASE_URL}/**`, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, STUB_USER);
    if (url.includes("/auth/v1/token")) return json(route, stubSession());
    if (url.includes("/auth/v1/logout")) return json(route, {});
    if (url.includes("/rpc/")) return json(route, []);

    let rows = TABLE_ROWS[tableFromUrl(url)] ?? [];
    const requestUrl = new URL(url);
    for (const [key, value] of requestUrl.searchParams) {
      if (!value.startsWith("eq.") || !rows.some((row) => Object.prototype.hasOwnProperty.call(row, key))) continue;
      const expected = value.slice(3);
      rows = rows.filter((row) => String((row as Record<string, unknown>)[key]) === expected);
    }
    // PostgREST: `.single()`/`.maybeSingle()` ask for an object, not an array.
    const accept = route.request().headers()["accept"] ?? "";
    if (accept.includes("vnd.pgrst.object")) {
      // `{}` rather than a 406 so `.maybeSingle()` on an unseeded table yields a
      // benign empty row instead of an error the caller has to survive.
      return json(route, rows.length ? rows[0] : {});
    }
    return json(route, rows);
  });

  // Anything else the bundle reaches for (analytics, fonts already inlined).
  await page.route("**/cdn-cgi/**", (route) => route.fulfill({ status: 204, body: "" }));
}

/** Text the ErrorBoundary renders when a route blows up. */
export const CRASH_TEXT = /Something went wrong/i;

/**
 * The production-only failure signature: React.lazy resolving `undefined`.
 * Collect console errors so a route that "renders" while logging this still fails.
 */
export function collectLazyChunkErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      /reading 'default'/i.test(text) ||
      /Failed to fetch dynamically imported module/i.test(text) ||
      /error loading dynamically imported module/i.test(text)
    ) {
      errors.push(text);
    }
  });
  return errors;
}
