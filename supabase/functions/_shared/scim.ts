/**
 * Shared helpers for SCIM 2.0 and SSO edge functions.
 * Kept in _shared/ so deploy.yml's directory walker skips it (prefix `_`).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export const scimHeaders = {
  "Content-Type": "application/scim+json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

export function scimError(status: number, detail: string, scimType?: string) {
  const body = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    status: String(status),
    detail,
    ...(scimType ? { scimType } : {}),
  };
  return new Response(JSON.stringify(body), { status, headers: scimHeaders });
}

export function scimJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: scimHeaders });
}

/** SHA-256 hex digest (same algorithm used when storing scim tokens). */
export async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Authenticate a SCIM request via Bearer token → returns tenant_id or null. */
export async function authenticateScim(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  const hashed = await sha256Hex(token);
  const sb = admin();
  const { data } = await sb
    .from("tenant_scim_tokens")
    .select("tenant_id, revoked_at")
    .eq("hashed_token", hashed)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  // Touch last_used_at (fire and forget)
  sb.from("tenant_scim_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("hashed_token", hashed)
    .then(() => {});
  return (data as any).tenant_id as string;
}

export interface ScimUserPayload {
  schemas: string[];
  userName: string;
  name?: { givenName?: string; familyName?: string };
  displayName?: string;
  emails?: Array<{ value: string; primary?: boolean }>;
  active?: boolean;
  externalId?: string;
}

export function toScimUserResource(row: any) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: row.id,
    externalId: row.external_id,
    userName: row.email,
    name: { givenName: row.given_name, familyName: row.family_name },
    displayName: row.display_name,
    emails: [{ value: row.email, primary: true }],
    active: row.active,
    meta: {
      resourceType: "User",
      created: row.created_at,
      lastModified: row.updated_at,
    },
  };
}
