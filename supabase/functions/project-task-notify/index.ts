// Authenticated mobile-push fan-out for project instructions.
// Database triggers create the durable in-app notifications; this function
// sends the immediate browser/phone push to the same accountable participants.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData } = await userClient.auth.getUser();
    const actor = authData?.user;
    if (!actor) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const actionItemId = String(body.actionItemId ?? "");
    const event = String(body.event ?? "update");
    if (!actionItemId) return json({ error: "actionItemId is required" }, 400);

    // User-client read makes project RLS the authorization boundary.
    const { data: item, error: itemError } = await userClient
      .from("project_action_items")
      .select("id,project_id,title,status,assigned_to,created_by")
      .eq("id", actionItemId)
      .maybeSingle();
    if (itemError || !item) return json({ error: "Project instruction not found" }, 404);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: project } = await admin.from("projects").select("name").eq("id", item.project_id).maybeSingle();
    const { data: watchers } = await admin.from("project_action_item_watchers").select("user_id").eq("action_item_id", item.id);
    const recipients = [...new Set([
      item.assigned_to,
      item.created_by,
      ...(watchers ?? []).map((watcher: any) => watcher.user_id),
    ].filter((id): id is string => Boolean(id) && id !== actor.id))];

    const title = event === "assignment"
      ? "New project instruction"
      : event === "comment"
        ? "New project instruction update"
        : event === "status"
          ? `Instruction is now ${String(item.status).replace(/_/g, " ")}`
          : "Project instruction updated";
    const pushBody = `${item.title}${project?.name ? ` — ${project.name}` : ""}`;
    const targetUrl = `/projects/${item.project_id}?tab=action-items&item=${item.id}`;

    let sent = 0;
    for (const userId of recipients) {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, title, body: pushBody, url: targetUrl }),
      }).catch(() => null);
      if (!response?.ok) continue;
      const result = await response.json().catch(() => ({}));
      sent += Number(result?.sent ?? 0);
    }

    return json({ ok: true, recipients: recipients.length, sent });
  } catch (error) {
    console.error("project-task-notify error:", error);
    return json({ error: error instanceof Error ? error.message : "Notification failed" }, 500);
  }
});
