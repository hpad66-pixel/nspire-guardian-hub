/**
 * F3 · OAuth2 Client Credentials grant.
 * POST /oauth/token  { grant_type: "client_credentials", client_id, client_secret, scope? }
 * → { access_token, token_type: "Bearer", expires_in, scope }
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TOKEN_TTL_SECONDS = 3600;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    } else {
      body = await req.json();
    }
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  if (body?.grant_type !== "client_credentials") {
    return json({ error: "unsupported_grant_type" }, 400);
  }
  const clientId = String(body?.client_id ?? "");
  const clientSecret = String(body?.client_secret ?? "");
  if (!clientId || !clientSecret) return json({ error: "invalid_client" }, 401);

  const { data: client } = await admin
    .from("api_clients")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();
  if (!client) return json({ error: "invalid_client" }, 401);

  const storedHash = String((client as any).client_secret_hash ?? "");
  // api-key-mint persists PBKDF2 hashes ("pbkdf2$<iters>$<saltB64>$<dkB64>").
  // Fall back to raw SHA-256 for any legacy rows minted via the old path.
  const secretOk = storedHash.startsWith("pbkdf2$")
    ? await verifyPbkdf2(clientSecret, storedHash)
    : timingSafeEqualStr(await sha256Hex(clientSecret), storedHash);
  if (!secretOk) {
    return json({ error: "invalid_client" }, 401);
  }

  // Issue access token (random 32 bytes, hex)
  const raw = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const tokenHash = await sha256Hex(raw);
  const requestedScopes = String(body?.scope ?? "").split(/\s+/).filter(Boolean);
  const clientScopes: string[] = (client as any).scopes ?? [];
  const grantedScopes = requestedScopes.length > 0
    ? requestedScopes.filter((s) => clientScopes.includes(s))
    : clientScopes;

  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  await admin.from("api_tokens").insert({
    tenant_id: (client as any).tenant_id,
    api_client_id: (client as any).id,
    access_token_hash: tokenHash,
    scopes: grantedScopes,
    expires_at: expiresAt,
  });

  return json({
    access_token: raw,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
    scope: grantedScopes.join(" "),
  });
});

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Constant-time string comparison to avoid leaking secret length/content via timing. */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify a plaintext secret against a "pbkdf2$<iters>$<saltB64>$<dkB64>" hash (matches api-key-mint). */
async function verifyPbkdf2(plaintext: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = b64decode(parts[2]);
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
  return timingSafeEqualStr(b64encode(new Uint8Array(dk)), parts[3]);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
