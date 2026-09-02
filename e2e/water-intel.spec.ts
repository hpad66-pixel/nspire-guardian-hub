/**
 * Water Intelligence — standalone executive module.
 *
 * Acceptance:
 *  1. Property-scoped tables + RLS + magic-link RPCs exist (tenant_id → workspaces).
 *  2. Glorieta seed covers the whole property (not Building 8 only).
 *  3. App routes: staff desk, admin toggle, magic link, ops portal.
 *  4. Public magic-link surface mounts without crashing.
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = path.resolve(
  __dirname,
  "../supabase/migrations/20260902020000_water_intelligence_module.sql",
);
const APP = path.resolve(__dirname, "../src/App.tsx");

test("migration creates tenant-isolated water intel tables", () => {
  const sql = fs.readFileSync(MIGRATION, "utf8");
  for (const table of ["water_service_accounts", "water_bills", "water_exec_notes", "water_exec_instructions"]) {
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    expect(sql).toMatch(new RegExp(`${table}[\\s\\S]{0,400}tenant_id uuid NOT NULL REFERENCES public\\.workspaces\\(id\\)`));
  }
  expect(sql).toContain("water_intel_enabled");
  expect(sql).toContain("current_tenant_id()");
  expect(sql).toContain("water_intel_resolve_token");
  expect(sql).toContain("water_intel_public_add_note");
  expect(sql).toContain("water_intel_set_enabled");
});

test("Glorieta seed includes every service address, not just Building 8", () => {
  const sql = fs.readFileSync(MIGRATION, "utf8");
  expect(sql).toContain("2745714336");
  expect(sql).toContain("Building 8");
  expect(sql).toContain("13235 Alexandria");
  expect(sql).toContain("13180 Port Said");
  expect(sql).toContain("13440 Aswan");
  expect(sql).toContain("13120 NW 32nd");
  expect(sql).toContain("13010 Alexandria");
});

test("real-bill overlay maps WASD account numbers from the June 2026 cycle", () => {
  const overlay = path.resolve(
    __dirname,
    "../supabase/migrations/20260902030000_water_intelligence_real_bills.sql",
  );
  const sql = fs.readFileSync(overlay, "utf8");
  for (const acct of [
    "2745714336",
    "1674911185",
    "8082997418",
    "2218802663",
    "4621903166",
    "1787762492",
    "7963207450",
    "1692380502",
    "0285466092",
    "9952938168",
  ]) {
    expect(sql).toContain(acct);
  }
  expect(sql).toContain("113874.41");
  expect(sql).toContain("source = 'ocr'");
});

test("App wires staff, admin, magic-link, and ops routes", () => {
  const app = fs.readFileSync(APP, "utf8");
  expect(app).toContain('path="/water/:token"');
  expect(app).toContain('path="/water-intel"');
  expect(app).toContain('path="/water-intel/:propertyId"');
  expect(app).toContain('path="/admin/water-intelligence"');
  expect(app).toContain('path="/ops-portal/properties/:propertyId/water"');
});

test("bill archive and QA overlay are checked into the repo", () => {
  const overlay = path.resolve(
    __dirname,
    "../supabase/migrations/20260902040000_water_intel_bill_documents.sql",
  );
  const archive = path.resolve(__dirname, "../docs/water-intel/glorieta-wasd-june-2026.json");
  const html = path.resolve(__dirname, "../public/water-bills/2745714336-2026-06.html");
  const layout = path.resolve(__dirname, "../src/components/layout/AppLayout.tsx");
  expect(fs.readFileSync(overlay, "utf8")).toContain("water-bills/");
  expect(fs.readFileSync(archive, "utf8")).toContain("122667.65");
  expect(fs.readFileSync(html, "utf8")).toContain("122,667.65");
  const appLayout = fs.readFileSync(layout, "utf8");
  expect(appLayout).not.toContain("overscroll-y-contain");
  expect(appLayout).not.toMatch(/overflow-y-auto/);
});

test("magic link page mounts for an unknown token", async ({ page }) => {
  await page.goto("/water/not-a-real-token");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByTestId("water-magic-page")).toBeVisible();
  await expect(page.getByText(/Water Intelligence/i).first()).toBeVisible();
});

test("WASD statement backups are served for quick view", async ({ page }) => {
  await page.goto("/water-bills/");
  await expect(page.getByText(/Glorieta Gardens/i)).toBeVisible();
  await expect(page.getByText("122,667.65")).toBeVisible();
  await page.goto("/water-bills/2745714336-2026-06.html");
  await expect(page.getByText("2745714336")).toBeVisible();
  await expect(page.getByText("Building 8")).toBeVisible();
});
