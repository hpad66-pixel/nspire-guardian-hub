/**
 * G4 · API Clients + Webhooks functional implementation.
 *
 * Static surface checks. Behaviour against a live DB is
 * exercised by the unit tests in src/hooks/__tests__/.
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ESM ("type":"module") has no __dirname — derive it from import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, "..");

function p(rel: string) { return path.join(root, rel); }

test.describe("G4 file scaffolding", () => {
  test("edge functions exist", () => {
    expect(fs.existsSync(p("supabase/functions/api-key-mint/index.ts"))).toBe(true);
    expect(fs.existsSync(p("supabase/functions/webhook-secret-rotate/index.ts"))).toBe(true);
    expect(fs.existsSync(p("supabase/functions/webhook-redeliver/index.ts"))).toBe(true);
  });

  test("hooks exist", () => {
    expect(fs.existsSync(p("src/hooks/useWebhooks.ts"))).toBe(true);
    expect(fs.existsSync(p("src/hooks/useWebhookDeliveries.ts"))).toBe(true);
  });

  test("dialogs and pages exist", () => {
    expect(fs.existsSync(p("src/components/settings/api/RevealSecretOnceDialog.tsx"))).toBe(true);
    expect(fs.existsSync(p("src/components/settings/api/CreateApiClientDialog.tsx"))).toBe(true);
    expect(fs.existsSync(p("src/components/settings/api/CreateWebhookDialog.tsx"))).toBe(true);
    expect(fs.existsSync(p("src/components/settings/api/RotateSecretDialog.tsx"))).toBe(true);
    expect(fs.existsSync(p("src/pages/settings/api/WebhookDeliveriesPage.tsx"))).toBe(true);
  });

  test("App.tsx mounts /settings/api/webhooks/:id/deliveries", () => {
    const src = fs.readFileSync(p("src/App.tsx"), "utf8");
    expect(src).toMatch(/\/settings\/api\/webhooks\/:id\/deliveries/);
    expect(src).toMatch(/WebhookDeliveriesPage/);
  });

  test("mint never persists plaintext (server-side only)", () => {
    const src = fs.readFileSync(p("supabase/functions/api-key-mint/index.ts"), "utf8");
    // The plaintext must be inserted nowhere into the api_clients
    // row -- only the hash is persisted.
    const insertBlock = src.match(/from\("api_clients"\)[\s\S]*?\.insert\(\{[\s\S]*?\}\)/);
    expect(insertBlock, "api_clients insert block").toBeTruthy();
    expect(insertBlock![0]).toMatch(/client_secret_hash/);
    expect(insertBlock![0]).not.toMatch(/client_secret\s*:/);
  });

  test("rotate persists the new signing secret (symmetric HMAC) plus a hash record", () => {
    const src = fs.readFileSync(p("supabase/functions/webhook-secret-rotate/index.ts"), "utf8");
    // HMAC webhook signing is symmetric: webhook-dispatch must reproduce the exact
    // secret to sign each delivery, so the new plaintext is persisted in `secret`
    // (retrievable, like Stripe/GitHub signing secrets) alongside a secret_hash.
    // Blanking `secret` here previously broke ALL deliveries after a rotate.
    const updateBlock = src.match(/\.update\(\{[\s\S]*?\}\)/);
    expect(updateBlock, "webhook_subscriptions update block").toBeTruthy();
    expect(updateBlock![0]).toMatch(/secret:\s*plaintext/);
    expect(updateBlock![0]).toMatch(/secret_hash/);
    // The plaintext must NOT be blanked — that was the post-rotate signing bug.
    expect(src).not.toMatch(/secret:\s*""/);
  });

  test("redeliver invokes webhook-dispatch with new delivery row", () => {
    const src = fs.readFileSync(p("supabase/functions/webhook-redeliver/index.ts"), "utf8");
    expect(src).toMatch(/functions\.invoke\(\"webhook-dispatch\"/);
    expect(src).toMatch(/from\(\"webhook_deliveries\"\)[\s\S]*?\.insert/);
  });

  test("RevealSecretOnceDialog warns about one-time visibility", () => {
    const src = fs.readFileSync(p("src/components/settings/api/RevealSecretOnceDialog.tsx"), "utf8");
    expect(src).toMatch(/only once/i);
    expect(src).toMatch(/cannot be retrieved again/i);
  });
});

// ------------------------------------------------------------
// Behavioural matrix -- needs an authenticated admin session.
// ------------------------------------------------------------
test.describe("G4 behaviour (requires authed admin)", () => {
  test.skip("Admin creates an API client and the plaintext is shown once", () => {});
  test.skip("Reopening the page does not re-show the secret -- only key_id prefix", () => {});
  test.skip("Non-admin user attempting create sees a 403 / disabled button", () => {});
  test.skip("Workspace on Starter plan sees the upgrade page instead of the form", () => {});
  test.skip("Admin creates a webhook and signing secret reveals once", () => {});
  test.skip("Admin rotates webhook secret -- new plaintext shown once, old hash overwritten", () => {});
  test.skip("Admin redelivers a failed delivery -- new delivery row appears", () => {});
  test.skip("Revoking an API client sets revoked_at -- subsequent API calls return 401", () => {});
  test.skip("RLS enforces tenant isolation on api_clients / webhooks / webhook_deliveries", () => {});
});
