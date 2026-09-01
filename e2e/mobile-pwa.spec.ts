import { test, expect, devices } from '@playwright/test';

/**
 * Mobile + installable PWA smoke:
 * - Phone viewport does not create document-level horizontal overflow on public pages
 * - /install guide is usable on mobile
 * - Built app exposes a web manifest (production preview / Pages)
 */

test.describe('Mobile responsive + downloadable PWA', () => {
  test.use({ ...devices['iPhone 13'] });

  test('install guide renders on a phone viewport', async ({ page }) => {
    await page.goto('/install');
    await expect(page.getByRole('heading', { name: /Install APAS Project Controls/i })).toBeVisible();
    await expect(page.getByText(/Add to Home Screen/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /iPhone \/ iPad/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Android/i })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('auth page stays within the phone viewport (no body horizontal scroll)', async ({ page }) => {
    await page.goto('/auth');
    // Wait for something interactive so layout settles.
    await page.waitForLoadState('domcontentloaded');
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
  });

  test('index.html advertises PWA install meta', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /viewport-fit=cover/);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      /manifest\.webmanifest/,
    );
  });
});
