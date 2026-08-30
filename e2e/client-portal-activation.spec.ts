import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAB = path.resolve(__dirname, "../src/components/projects/ClientPortalTab.tsx");
const DASHBOARD = path.resolve(__dirname, "../src/pages/portal/owner/OwnerDashboardPage.tsx");
const DOCS = path.resolve(__dirname, "../src/pages/portal/owner/OwnerDocumentsPage.tsx");
const GATE = path.resolve(__dirname, "../src/components/portal/PortalProtectedRoute.tsx");
const SHELL = path.resolve(__dirname, "../src/components/portal/ClientPortalShell.tsx");
const MIGRATION = path.resolve(__dirname, "../supabase/migrations/20260830180000_owner_portal_curated_content.sql");

test.describe("Client portal activation", () => {
  test("PM studio has an explicit activate control and owner preview", () => {
    const src = fs.readFileSync(TAB, "utf8");
    expect(src).toMatch(/data-testid="client-portal-activation"/);
    expect(src).toMatch(/Activate for client/);
    expect(src).toMatch(/Open owner view/);
    expect(src).toMatch(/buildPortalInviteUrl/);
    expect(src).not.toMatch(/\/portal\/\$\{portal\.portal_slug\}\/auth\?token=/);
  });

  test("owner dashboard shows curated summaries and shared files, not the full repo", () => {
    const dashboard = fs.readFileSync(DASHBOARD, "utf8");
    const docs = fs.readFileSync(DOCS, "utf8");
    expect(dashboard).toMatch(/Latest update/);
    expect(dashboard).toMatch(/Shared files/);
    expect(dashboard).toMatch(/full project repository/);
    expect(docs).toMatch(/Shared by your project team/);
    expect(docs).toMatch(/internal project repository is not included/);
  });

  test("super admin can open the owner portal without a membership lookup", () => {
    const gate = fs.readFileSync(GATE, "utf8");
    const shell = fs.readFileSync(SHELL, "utf8");
    expect(gate).toMatch(/isPlatformSuperAdmin/);
    expect(gate).toMatch(/setGate\(\{ status: 'allowed' \}\)/);
    expect(shell).toMatch(/Platform admin view/);
  });

  test("owners can read curated documents through RLS", () => {
    const sql = fs.readFileSync(MIGRATION, "utf8");
    expect(sql).toMatch(/client_documents_owner_portal_select/);
    expect(sql).toMatch(/owner_can_access_project\(project_id\)/);
    expect(sql).toMatch(/v_slug, 'draft', false/);
  });
});
