/**
 * G4 · api-key-mint
 *
 * POST /functions/v1/api-key-mint
 * Auth: Supabase user JWT (verified via auth.getUser).
 * Body: { name: string, scopes: string[], rate_limit?: number }
 *
 * Generates a brand-new API client + plaintext secret on the
 * server. Returns the plaintext secret EXACTLY ONCE in the
 * response body; only a salted hash is persisted in
 * api_clients.client_secret_hash. Plaintext is never logged
 * and never written to any table.
 *
 * Hashing: PBKDF2-HMAC-SHA256, 200_000 iterations, 32-byte
 * derived key, per-secret 16-byte random salt. The stored
 * value is "pbkdf2$200000$<saltB64>$<dkB64>". This is a step
 * up from raw SHA-256 (the prior client-side path) and works
 * with WebCrypto on Deno without an additional dependency.
 * The team can swap to argon2id when an audited Deno port is
 * adopted -- the verifier in oauth-token reads the algorithm
 * prefix.
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

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function pbkdf2Hash(plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 200_000;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plaintext),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const dk = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    32 * 8,
  );
  return `pbkdf2$${iterations}$${b64encode(salt)}$${b64encode(new Uint8Array(dk))}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Authenticate the caller via their Supabase JWT.
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

  // RBAC: only api_client:manage admins may mint.
  const { data: canMint, error: rbacErr } = await admin.rpc("can" as any, {
    p_user: user.id,
    p_module: "api",
    p_action: "create",
    p_min_level: "admin",
  } as any);
  if (rbacErr) return json({ error: "rbac_check_failed" }, 500);
  if (!canMint) return json({ error: "forbidden" }, 403);

  // Plan gate.
  const { data: hasFeature } = await admin.rpc("can_use_feature" as any, {
    p_feature: "api",
  } as any);
  if (!hasFeature) return json({ error: "plan_locked", feature: "api" }, 402);

  let body: { name?: string; scopes?: string[]; rate_limit?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.name || typeof body.name !== "string") {
    return json({ error: "name_required" }, 400);
  }
  if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
    return json({ error: "scopes_required" }, 400);
  }

  // Resolve tenant via the user's JWT claim.
  const { data: tenantRow } = await userClient.rpc("current_tenant_id" as any);
  const tenant_id = tenantRow as string | null;
  if (!tenant_id) return json({ error: "no_tenant" }, 400);

  // Mint plaintext + hash.
  const client_id = `pl_${randomBase62(24)}`;
  const client_secret = `pl_${randomBase62(32)}`;
  const client_secret_hash = await pbkdf2Hash(client_secret);

  const { data: row, error: insErr } = await admin
    .from("api_clients")
    .insert({
      tenant_id,
      name: body.name.trim(),
      client_id,
      client_secret_hash,
      scopes: body.scopes,
      rate_limit: body.rate_limit ?? 600,
      created_by: user.id,
    })
    .select("id, client_id, name, scopes, rate_limit, created_at")
    .single();

  if (insErr) return json({ error: "insert_failed", detail: insErr.message }, 500);

  // Plaintext returned exactly once. Never logged.
  return json({
    api_client: row,
    client_id,
    client_secret,            // <-- ONCE. Never persisted in plaintext.
    reveal_only_once: true,
  }, 201);
});
