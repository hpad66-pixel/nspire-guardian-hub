/**
 * G4 · webhook-secret-rotate
 *
 * POST /functions/v1/webhook-secret-rotate
 * Auth: Supabase user JWT.
 * Body: { webhook_id: string }
 *
 * Generates a new whsec_<32 base62> signing secret, persists
 * only the salted hash, and returns the plaintext exactly
 * once. The old hash is overwritten on the same row.
 *
 * The webhook_subscriptions table currently stores `secret`
 * as the plaintext. This rotate function transitions the row
 * to the new pattern: plaintext goes back to the caller
 * exactly once and only the `secret_hash` is persisted. The
 * `secret` column is set to '' on rotate so the legacy
 * plaintext is destroyed; webhook-dispatch will be updated
 * to read from secret_hash via verify-on-send.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function randomBase62(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += BASE62[bytes[i] % BASE62.length];
  return out;
}
function b64(b: Uint8Array): string {
  let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s);
}
async function pbkdf2Hash(plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const it = 200_000;
  const km = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(plaintext),
    { name: "PBKDF2" }, false, ["deriveBits"],
  );
  const dk = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: it, hash: "SHA-256" },
    km, 32 * 8,
  );
  return `pbkdf2$${it}$${b64(salt)}$${b64(new Uint8Array(dk))}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "missing_authorization" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "invalid_jwt" }, 401);
  const user = userData.user;

  const { data: canManage } = await admin.rpc("can" as any, {
    p_user: user.id, p_module: "api", p_action: "edit", p_min_level: "admin",
  } as any);
  if (!canManage) return json({ error: "forbidden" }, 403);

  const { data: hasFeature } = await admin.rpc("can_use_feature" as any, {
    p_feature: "webhooks",
  } as any);
  if (!hasFeature) return json({ error: "plan_locked", feature: "webhooks" }, 402);

  let body: { webhook_id?: string };
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }
  if (!body.webhook_id) return json({ error: "webhook_id_required" }, 400);

  // Fetch the row with the user's JWT so RLS confirms tenant ownership.
  const { data: existing, error: fetchErr } = await userClient
    .from("webhook_subscriptions")
    .select("id, tenant_id")
    .eq("id", body.webhook_id)
    .maybeSingle();
  if (fetchErr) return json({ error: "fetch_failed", detail: fetchErr.message }, 500);
  if (!existing) return json({ error: "not_found" }, 404);

  const plaintext = `whsec_${randomBase62(32)}`;
  const secret_hash = await pbkdf2Hash(plaintext);

  // Overwrite plaintext to '' so the prior cleartext is destroyed.
  // secret_hash holds the new salted hash going forward.
  const { error: updErr } = await admin
    .from("webhook_subscriptions")
    .update({ secret: "", secret_hash })
    .eq("id", existing.id);

  if (updErr) {
    // If the column secret_hash hasn't been added yet (legacy
    // schema), surface a clear error so the operator knows
    // the migration step is missing.
    return json({
      error: "rotate_failed",
      detail: updErr.message,
      hint: "ensure webhook_subscriptions.secret_hash exists (G4 migration)",
    }, 500);
  }

  return json({ webhook_id: existing.id, signing_secret: plaintext, reveal_only_once: true });
});
