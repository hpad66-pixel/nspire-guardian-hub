/**
 * G2 · rfi_attachments polymorphic FK tenant boundary.
 *
 * The full INSERT/UPDATE × tenant-mismatch matrix needs a live
 * Postgres + two-tenant seed; documented as test.skip blocks for
 * a future seeded-DB CI job. This file enforces the migration's
 * structural shape statically.
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../supabase/migrations/20260428120100_g2_rfi_attachment_tenant_boundary.sql",
);

test.describe("G2 migration shape", () => {
  test("migration file exists", () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  test("CHECK enforces exactly-one-of-three FKs", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/rfi_attachments_one_parent_chk/);
    // The CHECK arithmetic adds three IS NOT NULL casts and
    // requires the sum to equal 1.
    expect(sql).toMatch(/document_id\s+IS NOT NULL/);
    expect(sql).toMatch(/photo_id\s+IS NOT NULL/);
    expect(sql).toMatch(/drawing_markup_id\s+IS NOT NULL/);
    expect(sql).toMatch(/=\s*1/);
  });

  test("trigger function is SECURITY DEFINER with locked search_path", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.check_rfi_attachment_tenant/,
    );
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = public/);
  });

  test("trigger raises on tenant mismatch", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(
      /rfi_attachment tenant mismatch: parent tenant=% attachment tenant=%/,
    );
  });

  test("BEFORE INSERT OR UPDATE trigger is attached", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS rfi_attachments_tenant_boundary/);
    expect(sql).toMatch(
      /CREATE TRIGGER rfi_attachments_tenant_boundary[\s\S]*BEFORE INSERT OR UPDATE/,
    );
  });

  test("function and trigger are re-runnable", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION/);
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS/);
  });

  test("sanity-check DO block enforces trigger + CHECK presence", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/G2 sanity: trigger missing/);
    expect(sql).toMatch(/G2 sanity: one-parent CHECK missing/);
  });
});

// ------------------------------------------------------------
// Behavioural matrix — activated when CI seeds two tenants.
// ------------------------------------------------------------
test.describe("G2 trigger behaviour (requires seeded tenants)", () => {
  test.skip("inserting rfi_attachment referencing a different-tenant document raises", () => {});
  test.skip("inserting rfi_attachment referencing a same-tenant document succeeds", () => {});
  test.skip("updating rfi_attachment to point to a different-tenant document raises", () => {});
  test.skip("inserting with all three FK columns null violates the CHECK", () => {});
  test.skip("inserting with two FK columns set violates the CHECK", () => {});
  test.skip("same-tenant matrix passes for photo_id and drawing_markup_id", () => {});
});
