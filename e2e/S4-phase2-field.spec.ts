/**
 * S4 · Phase-2 field-parity smoke specs.
 *
 * These only assert the unauth redirect + route registration for the new
 * project-scoped pages introduced in Sprint 4 — deeper UX tests require
 * a seeded auth fixture which is tracked separately.
 */
import { test, expect } from "@playwright/test";

test.describe("S4 drawings viewer route", () => {
  test("drawings list requires auth", async ({ page }) => {
    await page.goto("/projects/abc/drawings");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("drawing viewer requires auth", async ({ page }) => {
    await page.goto("/projects/abc/drawings/xyz");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("S4 specifications route", () => {
  test("specifications page requires auth", async ({ page }) => {
    await page.goto("/projects/abc/specifications");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("S4 photos route", () => {
  test("photos page requires auth", async ({ page }) => {
    await page.goto("/projects/abc/photos");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("S4 project documents route", () => {
  test("project documents requires auth", async ({ page }) => {
    await page.goto("/projects/abc/documents");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("S4 meetings routes", () => {
  test("meetings list requires auth", async ({ page }) => {
    await page.goto("/projects/abc/meetings");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("meeting run page requires auth", async ({ page }) => {
    await page.goto("/projects/abc/meetings/zzz");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("meeting templates page requires auth", async ({ page }) => {
    await page.goto("/projects/abc/meetings/templates");
    await expect(page).toHaveURL(/\/auth/);
  });
});
