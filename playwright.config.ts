import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // The prod-build smoke runs against a different server (see below).
      testIgnore: /\.prodsmoke\.spec\.ts$/,
    },
    {
      // Runs the SHIPPED rollup bundle, not the dev module graph. A lazy route
      // can import fine in dev and still resolve `undefined` in production —
      // that blind spot is what let the vendor-payment-ledger crash reach users.
      name: 'prod-build',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4178' },
      testMatch: /\.prodsmoke\.spec\.ts$/,
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      // Vite dev server listens on 8080 (vite.config.ts server.port), not Vite's
      // default 5173 — Playwright must wait on the same port or it times out.
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      // Builds with stub Supabase env, then serves dist. The build is why this
      // gets a longer timeout than the dev server.
      command: 'npm run preview:e2e',
      url: 'http://localhost:4178',
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
    },
  ],
});
