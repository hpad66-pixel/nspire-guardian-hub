/**
 * G4 · webhook-redeliver
 *
 * POST /functions/v1/webhook-redeliver
 * Auth: Supabase user JWT.
 * Body: { delivery_id: string }
 *
 * Looks up the stored delivery row, copies its event_type +
 * payload into a new delivery attempt, and invokes the
 * existing webhook-dispatch edge function to actually fire
 * the HTTP call. Returns the new delivery row id.
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
    p_user: user.id, p_module: "api", p_action: "edit", p_min_level: "standard",
  } as any);
  if (!canManage) return json({ error: "forbidden" }, 403);

  let body: { delivery_id?: string };
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }
  if (!body.delivery_id) return json({ error: "delivery_id_required" }, 400);

  // Read the original delivery via the user's JWT so RLS
  // confirms tenant ownership.
  const { data: orig, error: fetchErr } = await userClient
    .from("webhook_deliveries")
    .select("id, tenant_id, webhook_subscription_id, event_type, payload")
    .eq("id", body.delivery_id)
    .maybeSingle();
  if (fetchErr) return json({ error: "fetch_failed", detail: fetchErr.message }, 500);
  if (!orig) return json({ error: "not_found" }, 404);

  // Insert a fresh delivery attempt and let webhook-dispatch
  // pick it up. We seed attempt_no=1 so it's not confused with
  // an automated retry of the original.
  const { data: created, error: insErr } = await admin
    .from("webhook_deliveries")
    .insert({
      tenant_id: orig.tenant_id,
      webhook_subscription_id: orig.webhook_subscription_id,
      event_type: orig.event_type,
      payload: orig.payload,
      attempt_no: 1,
      next_retry_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr) return json({ error: "insert_failed", detail: insErr.message }, 500);

  // Best-effort kick of the dispatcher. If it fails the
  // delivery row will be picked up by the regular cron path.
  try {
    await admin.functions.invoke("webhook-dispatch", {
      body: { delivery_id: created.id },
    });
  } catch (_) {
    // Swallow -- the row is queued and will be retried.
  }

  return json({ new_delivery_id: created.id }, 201);
});
