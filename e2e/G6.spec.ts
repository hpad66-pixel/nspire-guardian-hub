/**
 * G6 · CLAUDE.md G-series convention verification.
 *
 * Locks the contract that Rules 8/9/10, the Phase sign-off
 * checklist, the Procore_Lite_Gap_Closure_Prompts.md companion
 * artifact, and the v1.1 footer are all present in CLAUDE.md.
 * If any of these drift, this spec fails and the regression
 * surfaces in CI.
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const CLAUDE = path.resolve(__dirname, "../CLAUDE.md");

test("CLAUDE.md exists", () => {
  expect(fs.existsSync(CLAUDE)).toBe(true);
});

test("Rule 8 — polymorphic FK tenant-boundary trigger", () => {
  const md = fs.readFileSync(CLAUDE, "utf8");
  expect(md).toMatch(/### 8\. Polymorphic FKs need a tenant-boundary trigger/);
  expect(md).toMatch(/BEFORE INSERT OR UPDATE/);
  expect(md).toMatch(/SECURITY DEFINER/);
});

test("Rule 9 — portals role + plan gated", () => {
  const md = fs.readFileSync(CLAUDE, "utf8");
  expect(md).toMatch(/### 9\. Portals are role \+ plan gated/);
  expect(md).toMatch(/PortalProtectedRoute/);
  expect(md).toMatch(/canUseFeature/);
});

test("Rule 10 — once-only secret reveal", () => {
  const md = fs.readFileSync(CLAUDE, "utf8");
  expect(md).toMatch(/### 10\. Secrets are revealed once, never stored/);
  expect(md).toMatch(/RevealSecretOnceDialog/);
  expect(md).toMatch(/revoked_at/);
});

test("Phase sign-off checklist is present with all subsections", () => {
  const md = fs.readFileSync(CLAUDE, "utf8");
  expect(md).toMatch(/## Phase sign-off checklist/);
  expect(md).toMatch(/Foundation hygiene/);
  expect(md).toMatch(/Shared services/);
  expect(md).toMatch(/Portals/);
  expect(md).toMatch(/Secrets/);
  expect(md).toMatch(/Routing/);
  expect(md).toMatch(/Tests/);
});

test("Companion artifacts list includes Gap Closure Prompts", () => {
  const md = fs.readFileSync(CLAUDE, "utf8");
  expect(md).toMatch(/Procore_Lite_Gap_Closure_Prompts\.md/);
});

test("Footer is bumped to v1.1 with the 2026-04-26 date", () => {
  const md = fs.readFileSync(CLAUDE, "utf8");
  expect(md).toMatch(/v1\.1/);
  expect(md).toMatch(/2026-04-26/);
});

test("workspaces(id) is the canonical SaaS tenant FK target", () => {
  const md = fs.readFileSync(CLAUDE, "utf8");
  expect(md).toMatch(/REFERENCES public\.workspaces\(id\)/);
});
