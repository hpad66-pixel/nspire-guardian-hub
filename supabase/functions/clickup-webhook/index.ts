// Inbound ClickUp webhook → update the linked Build OS action item.
// Public (verify_jwt=false); authenticity is enforced by verifying ClickUp's
// HMAC-SHA256 signature (X-Signature) against the stored webhook_secret.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const CU = "https://api.clickup.com/api/v2";

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ClickUp status.type → our action_item status.
function mapStatus(type?: string): string | null {
  if (type === "done" || type === "closed") return "done";
  if (type === "open") return "todo";
  if (type === "custom") return "in_progress";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const raw = await req.text();
    const sig = req.headers.get("X-Signature") ?? "";
    let body: any;
    try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400, headers: cors }); }

    const webhookId = body?.webhook_id ? String(body.webhook_id) : "";
    const taskId = body?.task_id ? String(body.task_id) : "";
    if (!webhookId || !taskId) return new Response(JSON.stringify({ ignored: true }), { status: 200, headers: cors });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: conn } = await admin.from("clickup_connections").select("token, webhook_secret").eq("webhook_id", webhookId).maybeSingle();
    if (!conn?.webhook_secret) return new Response(JSON.stringify({ ignored: true }), { status: 200, headers: cors });

    // Verify signature — reject anything not signed with our secret.
    const expected = await hmacHex(conn.webhook_secret, raw);
    if (expected !== sig) return new Response("bad signature", { status: 401, headers: cors });

    if (body.event === "taskDeleted") {
      await admin.from("project_action_items").update({ clickup_task_id: null }).eq("clickup_task_id", taskId);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
    }

    // Read the task's current status and mirror it.
    const tr = await fetch(`${CU}/task/${taskId}`, { headers: { Authorization: conn.token } });
    if (tr.ok) {
      const task = await tr.json();
      const status = mapStatus(task?.status?.type);
      if (status) {
        await admin.from("project_action_items").update({
          status,
          completed_at: status === "done" ? new Date().toISOString() : null,
        }).eq("clickup_task_id", taskId);
      }
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  } catch (e) {
    console.error("clickup-webhook error:", e);
    return new Response("error", { status: 500, headers: cors });
  }
});
