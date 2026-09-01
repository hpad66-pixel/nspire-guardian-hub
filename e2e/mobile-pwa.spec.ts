import { test, expect } from '@playwright/test';

/**
 * Mobile + installable PWA smoke (Chromium phone viewport):
 * - Phone viewport does not create document-level horizontal overflow on public pages
 * - /install guide is usable on mobile
 * - App advertises PWA install meta + manifest
 *
 * Uses an explicit viewport (not devices['iPhone 13']) so CI chromium workers
 * do not require a separate WebKit browser download.
 */
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});

test.describe('Mobile responsive + downloadable PWA', () => {
  test('install guide renders on a phone viewport', async ({ page }) => {
    await page.goto('/install');
    // InstallPage is public; wait for the lazy route to settle.
    await expect(page.getByText(/Install APAS Project Controls/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Add to Home Screen/i).first()).toBeVisible();
    await expect(page.getByText(/iPhone \/ iPad/i).first()).toBeVisible();
    await expect(page.getByText(/Android/i).first()).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('auth page stays within the phone viewport (no body horizontal scroll)', async ({ page }) => {
    await page.goto('/auth');
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
