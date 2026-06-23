/**
 * F1/F2 · accept-portal-invitation
 * Public endpoint: /accept-portal-invitation?token=<uuid>
 * Creates or links an auth.users record, writes portal_memberships, marks the
 * invitation accepted, and returns a magic link for the user to follow.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "http://localhost:5173";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const token = url.searchParams.get("token")
    ?? (await safeJson(req))?.token;
  if (!token) return json({ error: "missing_token" }, 400);

  const { data: invite } = await admin
    .from("portal_invitations").select("*").eq("token", token).maybeSingle();
  if (!invite) return json({ error: "invalid_token" }, 404);
  if ((invite as any).accepted_at) return json({ error: "already_accepted" }, 410);
  if (new Date((invite as any).expires_at) < new Date()) return json({ error: "expired" }, 410);

  const email = (invite as any).email as string;

  // Create or fetch user
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1, email } as any);
  const user = (existing as any)?.users?.[0]
    ?? (await admin.auth.admin.createUser({
         email,
         email_confirm: true,
         user_metadata: {
           portal_kind: (invite as any).portal_kind,
           tenant_id: (invite as any).tenant_id,
         },
         app_metadata: {
           tenant_id: (invite as any).tenant_id,
           portal_kind: (invite as any).portal_kind,
         },
       })).data?.user;
  if (!user) return json({ error: "user_create_failed" }, 500);

  // Write portal_memberships
  await admin.from("portal_memberships").upsert({
    tenant_id: (invite as any).tenant_id,
    user_id: (user as any).id,
    organization_id: (invite as any).organization_id,
    portal_kind: (invite as any).portal_kind,
    role: (invite as any).role,
    is_active: true,
  }, { onConflict: "user_id,tenant_id,portal_kind" });

  await admin.from("portal_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  const redirect = (invite as any).portal_kind === "owner"
    ? `${APP_ORIGIN}/owner-portal`
    : `${APP_ORIGIN}/sub-portal`;

  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: redirect },
  });

  return json({ ok: true, redirect_url: (link as any)?.properties?.action_link ?? redirect });
});

async function safeJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return null; }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
