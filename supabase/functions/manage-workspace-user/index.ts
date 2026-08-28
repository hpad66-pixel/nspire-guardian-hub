import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Authentication required" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const targetUserId = String(body.userId ?? "");
  if (action !== "set_status" || !targetUserId) {
    return json({ error: "action and userId are required" }, 400);
  }

  const status = String(body.status ?? "");
  if (!['active', 'deactivated'].includes(status)) {
    return json({ error: "status must be active or deactivated" }, 400);
  }

  const { data: canManage, error: permissionError } = await userClient.rpc(
    "can_administer_workspace_user",
    { _target_user_id: targetUserId },
  );
  if (permissionError) return json({ error: "Permission check failed" }, 500);
  if (!canManage) return json({ error: "You cannot manage this user" }, 403);

  const { data: actorProfile } = await admin
    .from("profiles")
    .select("workspace_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("workspace_id,status")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!actorProfile?.workspace_id || !targetProfile ||
      actorProfile.workspace_id !== targetProfile.workspace_id) {
    return json({ error: "User is outside the active workspace" }, 403);
  }

  const previousStatus = targetProfile.status ?? "active";
  if (previousStatus === status) return json({ success: true, status });

  // A very long ban is used for deactivation; "none" explicitly removes it.
  const { error: authAdminError } = await admin.auth.admin.updateUserById(
    targetUserId,
    { ban_duration: status === "deactivated" ? "876000h" : "none" },
  );
  if (authAdminError) return json({ error: authAdminError.message }, 500);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", targetUserId)
    .eq("workspace_id", actorProfile.workspace_id);
  if (profileError) {
    // Roll back the auth state if the database write fails.
    await admin.auth.admin.updateUserById(targetUserId, {
      ban_duration: previousStatus === "deactivated" ? "876000h" : "none",
    });
    return json({ error: profileError.message }, 500);
  }

  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;
  await Promise.all([
    admin.from("user_status_history").insert({
      user_id: targetUserId,
      previous_status: previousStatus,
      new_status: status,
      reason,
      changed_by: authData.user.id,
    }),
    admin.from("enterprise_user_audit_log").insert({
      tenant_id: actorProfile.workspace_id,
      actor_user_id: authData.user.id,
      target_user_id: targetUserId,
      action: status === "active" ? "user.reactivated" : "user.deactivated",
      details: { previous_status: previousStatus, new_status: status, reason },
    }),
  ]);

  return json({ success: true, status });
});
