/**
 * G1 · Tenant isolation hardening — RFI + Daily Report children.
 *
 * The full SELECT/INSERT/UPDATE/DELETE × tenantA/tenantB matrix
 * requires two seeded tenants with a live Supabase + JWT pair,
 * which is not part of the default Playwright run (matches the
 * pattern in A1-multi-tenant.spec.ts).
 *
 * What this file enforces today:
 *   1. The G1 migration file exists and contains every patched
 *      table, the tenant_isolation policy template, and the
 *      idempotency guards required by CLAUDE.md.
 *   2. The app's protected surface still loads (no regression
 *      from the migration).
 *
 * The full isolation matrix is captured as `test.skip(...)`
 * blocks so a future CI job that seeds two tenants can flip
 * them on without rewriting the spec.
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../supabase/migrations/20260428120000_g1_tenant_isolation_rfi_daily_log.sql",
);

const PATCHED_TABLES = [
  "rfi_responses",
  "rfi_attachments",
  "daily_weather",
  "daily_manpower",
  "daily_equipment",
  "daily_deliveries",
  "daily_safety_violations",
  "daily_accidents",
  "daily_quantities",
  "daily_productivity",
  "daily_visitors",
  "daily_calls",
  "daily_notes",
  "daily_dumpster",
  "daily_scheduled_work",
];

test.describe("G1 migration shape", () => {
  test("migration file exists", () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  test("migration references workspaces(id), never tenants(id)", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toContain("public.workspaces(id)");
    // No SaaS-tenant references should target the residential
    // leasing public.tenants table.
    expect(sql).not.toMatch(/REFERENCES\s+public\.tenants\s*\(\s*id\s*\)/i);
  });

  test("every patched table is covered by the migration", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    for (const tbl of PATCHED_TABLES) {
      expect(sql, `expected migration to mention ${tbl}`).toContain(tbl);
    }
  });

  test("standard tenant_isolation policy template is present", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/tenant_id\s*=\s*public\.current_tenant_id\(\)/);
    expect(sql).toMatch(/public\.is_super_admin\(\)/);
    expect(sql).toMatch(/_tenant_isolation/);
  });

  test("migration is idempotent (ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE INDEX IF NOT EXISTS)", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS tenant_id/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS/);
  });

  test("sanity-check DO block enforces NOT NULL + policy presence", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/G1 sanity: tenant_id column missing/);
    expect(sql).toMatch(/G1 sanity: tenant_id is nullable/);
    expect(sql).toMatch(/G1 sanity: tenant_isolation policy missing/);
  });
});

test.describe("G1 regression — app still loads", () => {
  test("auth page renders", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("body")).toBeVisible();
  });

  test("protected dashboard bounces guests", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth(?:\b|\?|$)/);
  });
});

// ------------------------------------------------------------
// Full isolation matrix — activated when CI seeds two tenants.
// Each `test.skip(...)` documents an ACCEPTANCE TEST bullet
// from the G1 prompt verbatim.
// ------------------------------------------------------------
test.describe("G1 isolation matrix (requires seeded tenants)", () => {
  for (const table of PATCHED_TABLES) {
    for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"] as const) {
      test.skip(`tenantA cannot ${op} a ${table} row owned by tenantB`, () => {
        // pending two-tenant DB seed harness
      });
    }
  }

  test.skip("RFI response created by tenantA is invisible to tenantB even when tenantB knows the RFI ID", () => {
    // pending two-tenant DB seed harness
  });

  test.skip("Daily Report manpower entry created by tenantA is invisible to tenantB", () => {
    // pending two-tenant DB seed harness
  });

  test.skip("super admin can see all rows across tenants", () => {
    // pending super-admin JWT in the test harness
  });

  test.skip("supabase db push --dry-run succeeds against a fresh DB", () => {
    // run as a CI step, not inside Playwright
  });
});
