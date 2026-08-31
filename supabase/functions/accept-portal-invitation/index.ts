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
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const body = await safeJson(req);
  const token = url.searchParams.get("token") ?? body?.token;
  if (!token) return json({ error: "missing_token" }, 400);

  const { data: invite } = await admin
    .from("portal_invitations").select("*").eq("token", token).maybeSingle();
  if (!invite) return json({ error: "invalid_token" }, 404);
  if ((invite as any).accepted_at) return json({ error: "already_accepted" }, 410);
  if (new Date((invite as any).expires_at) < new Date()) return json({ error: "expired" }, 410);

  const email = (invite as any).email as string;

  // Create or fetch the exact invited user. listUsers does not support an email
  // filter; passing one is silently ignored and can select the wrong account.
  const existing = await findUserByEmail(email);
  const user = existing ?? (await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      // handle_new_user treats workspace_id as an invitation to join this
      // tenant. Without it, accepting a portal invite accidentally provisions
      // a brand-new, unrelated company workspace for the client.
      workspace_id: (invite as any).tenant_id,
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
  const { error: membershipError } = await admin.from("portal_memberships").upsert({
    tenant_id: (invite as any).tenant_id,
    user_id: (user as any).id,
    organization_id: (invite as any).organization_id,
    portal_kind: (invite as any).portal_kind,
    role: (invite as any).role,
    is_active: true,
  }, { onConflict: "user_id,tenant_id,portal_kind" });
  if (membershipError) return json({ error: "membership_create_failed" }, 500);

  const { error: acceptError } = await admin.from("portal_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);
  if (acceptError) return json({ error: "invitation_update_failed" }, 500);

  // Deep-link owners into the exact project they were invited to. Falling back
  // to flat /owner-portal made every client land on contracts[0].
  const inviteProjectId = (invite as any).project_id as string | null | undefined;
  let ownerDestination = `${APP_ORIGIN}/owner-portal`;
  if (inviteProjectId) {
    ownerDestination = body?.next === "schedule"
      ? `${APP_ORIGIN}/owner-portal/projects/${inviteProjectId}/schedule`
      : `${APP_ORIGIN}/owner-portal/projects/${inviteProjectId}`;
  } else if (body?.next === "schedule") {
    ownerDestination = `${APP_ORIGIN}/owner-portal/schedule`;
  }
  const redirect = (invite as any).portal_kind === "owner"
    ? ownerDestination
    : `${APP_ORIGIN}/sub-portal`;

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: redirect },
  });
  if (linkError) return json({ error: "magic_link_failed" }, 500);

  return json({ ok: true, redirect_url: (link as any)?.properties?.action_link ?? redirect });
});

async function safeJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return null; }
}

async function findUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;
    if (users.length < 1000) return null;
  }
  throw new Error("User directory lookup exceeded the safe pagination limit");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
