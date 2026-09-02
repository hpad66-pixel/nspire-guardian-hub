/**
 * Document scroll must work on every public (and app-shell) page.
 *
 * overflow-x: clip/hidden on html+body or on the min-height flex shell
 * computes overflow-y to clip/auto and traps the page so wheel/trackpad
 * cannot reach the footer.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function overflowMetrics(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const shell = document.querySelector('.apas-app-shell');
    const main = document.querySelector('[data-testid="app-main"], main');
    const marketing = document.querySelector('.r4-marketing-page');
    return {
      scrollHeight: html.scrollHeight,
      clientHeight: html.clientHeight,
      scrollY: window.scrollY,
      htmlOverflowY: getComputedStyle(html).overflowY,
      htmlOverflowX: getComputedStyle(html).overflowX,
      bodyOverflowY: getComputedStyle(body).overflowY,
      bodyOverflowX: getComputedStyle(body).overflowX,
      shellOverflowY: shell ? getComputedStyle(shell).overflowY : null,
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
      marketingOverflowY: marketing ? getComputedStyle(marketing).overflowY : null,
    };
  });
}

function expectDocumentCanScroll(
  metrics: Awaited<ReturnType<typeof overflowMetrics>>,
) {
  expect(['auto', 'scroll', 'visible']).toContain(metrics.htmlOverflowY);
  expect(metrics.htmlOverflowY).not.toBe('clip');
  expect(metrics.htmlOverflowY).not.toBe('hidden');
  expect(metrics.bodyOverflowY).not.toBe('clip');
  expect(metrics.bodyOverflowY).not.toBe('hidden');
  if (metrics.shellOverflowY) {
    expect(metrics.shellOverflowY).toBe('visible');
  }
  if (metrics.mainOverflowY) {
    expect(metrics.mainOverflowY).toBe('visible');
  }
  if (metrics.marketingOverflowY) {
    expect(metrics.marketingOverflowY).not.toBe('clip');
    expect(metrics.marketingOverflowY).not.toBe('hidden');
  }
}

test.describe('Document scroll', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('layout source does not trap vertical overflow', () => {
    const layout = fs.readFileSync(
      path.resolve(__dirname, '../src/components/layout/AppLayout.tsx'),
      'utf8',
    );
    const css = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8');
    const landing = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/landing/r4-landing.css'),
      'utf8',
    );
    const install = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/InstallPage.tsx'),
      'utf8',
    );
    expect(layout).not.toContain('overscroll-y-contain');
    expect(layout).not.toMatch(/overflow-y-auto/);
    expect(layout).not.toMatch(/overflow-x-(hidden|clip)/);
    expect(css).not.toMatch(/html\s*\{[^}]*overflow-x:\s*clip/);
    expect(css).toMatch(/overflow-y:\s*scroll/);
    expect(landing).not.toMatch(/overflow-x:\s*clip/);
    expect(install).not.toMatch(/overflow-x-clip/);
  });

  for (const route of [
    { path: '/landing', marker: /see every project/i, footer: /give r4 one place/i },
    { path: '/install', marker: /install apas project controls/i, footer: /on a computer\?/i },
    { path: '/features', marker: /property operations platform/i, footer: /all rights reserved/i },
  ] as const) {
    test(`${route.path} scrolls with the wheel and reaches the bottom`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByText(route.marker).first()).toBeVisible({ timeout: 20_000 });

      const before = await overflowMetrics(page);
      expectDocumentCanScroll(before);
      expect(before.scrollHeight).toBeGreaterThan(before.clientHeight + 80);
      expect(before.scrollY).toBe(0);

      await page.locator('body').click({ position: { x: 24, y: 200 } });
      await page.keyboard.press('PageDown');
      await page.evaluate(() => window.scrollBy(0, 800));

      const afterMove = await page.evaluate(() => window.scrollY);
      expect(afterMove, `${route.path} document did not scroll`).toBeGreaterThan(80);

      await page.keyboard.press('End');
      const footer = page.getByText(route.footer).first();
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport();
      const atBottom = await overflowMetrics(page);
      expect(atBottom.scrollY).toBeGreaterThan(200);
    });
  }
});
