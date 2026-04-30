/**
 * G3 · Portal authentication middleware.
 *
 * Static + smoke checks. The full auth/role/plan matrix is unit
 * tested in src/components/portal/__tests__/PortalProtectedRoute.test.tsx
 * with mocked auth + RBAC + billing; this Playwright spec covers
 * the visible behaviour the user sees in the browser, and asserts
 * the App.tsx route wrapping is in place.
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const APP_TSX = path.resolve(__dirname, "../src/App.tsx");
const COMPONENT = path.resolve(
  __dirname,
  "../src/components/portal/PortalProtectedRoute.tsx",
);
const UPGRADE = path.resolve(
  __dirname,
  "../src/components/portal/UpgradeRequired.tsx",
);

test.describe("G3 wiring", () => {
  test("PortalProtectedRoute and UpgradeRequired components exist", () => {
    expect(fs.existsSync(COMPONENT)).toBe(true);
    expect(fs.existsSync(UPGRADE)).toBe(true);
  });

  test("App.tsx wraps /portal/sub and /portal/owner routes", () => {
    const src = fs.readFileSync(APP_TSX, "utf8");
    expect(src).toMatch(/PortalProtectedRoute role="subcontractor"\s+feature="sub_portal"/);
    expect(src).toMatch(/PortalProtectedRoute role="owner"\s+feature="owner_portal"/);
  });

  test("auth-redirect uses /login?next=<encoded path>", () => {
    const src = fs.readFileSync(COMPONENT, "utf8");
    expect(src).toMatch(/encodeURIComponent\(location\.pathname/);
    expect(src).toMatch(/\/login\?next=/);
  });

  test("plan failure renders UpgradeRequired in place (no redirect)", () => {
    const src = fs.readFileSync(COMPONENT, "utf8");
    expect(src).toMatch(/<UpgradeRequired/);
    // forbidden case redirects, plan-locked must NOT redirect
    const planBlock = src.split("plan-locked")[1] ?? "";
    expect(planBlock).not.toMatch(/<Navigate/);
  });

  test("role failure redirects to /dashboard with toast", () => {
    const src = fs.readFileSync(COMPONENT, "utf8");
    expect(src).toMatch(/toast\.error\(\"You don't have access to that portal\.\"\)/);
    expect(src).toMatch(/Navigate to=\"\/dashboard\"/);
  });
});

test.describe("G3 browser smoke (no seeded session)", () => {
  test("guest hitting /portal/sub/commitments lands on auth flow", async ({ page }) => {
    await page.goto("/portal/sub/commitments");
    // No portal session in default test profile, so we expect
    // either the login redirect (/login or /auth) or an
    // unauthenticated landing -- not the portal commitments
    // page itself.
    await expect(page).not.toHaveURL(/\/portal\/sub\/commitments$/);
  });

  test("guest hitting /portal/owner lands on auth flow", async ({ page }) => {
    await page.goto("/portal/owner");
    await expect(page).not.toHaveURL(/\/portal\/owner$/);
  });
});
