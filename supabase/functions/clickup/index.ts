// ClickUp integration (one-way push). One endpoint, several actions:
//   { action: 'status' }                         → { connected, listName, teamName, username }
//   { action: 'connect', token, listId }         → validate + store connection
//   { action: 'disconnect' }                     → remove connection
//   { action: 'push', actionItemId }             → create/update a ClickUp task
//
// The API token is an outbound secret: stored in clickup_connections (RLS denies
// all browser access) and only ever read here with the service-role key.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const CU = "https://api.clickup.com/api/v2";
const PRIORITY: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };

async function cuGet(token: string, path: string) {
  return fetch(`${CU}${path}`, { headers: { Authorization: token } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: prof } = await admin.from("profiles").select("workspace_id").eq("user_id", user.id).maybeSingle();
    const tenantId = prof?.workspace_id;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const loadConn = async () =>
      (await admin.from("clickup_connections").select("*").eq("tenant_id", tenantId).maybeSingle()).data;

    // ── status ──────────────────────────────────────────────────────────────
    if (action === "status") {
      const conn = await loadConn();
      return json({
        connected: !!conn,
        listId: conn?.default_list_id ?? null,
        listName: conn?.default_list_name ?? null,
        teamName: conn?.team_name ?? null,
      });
    }

    // ── connect ─────────────────────────────────────────────────────────────
    if (action === "connect") {
      const token = String(body.token ?? "").trim();
      const listId = String(body.listId ?? "").trim();
      if (!token) return json({ error: "Paste your ClickUp API token." }, 400);

      const userRes = await cuGet(token, "/user");
      if (!userRes.ok) return json({ error: "That token was rejected by ClickUp." }, 400);
      const cuUser = (await userRes.json())?.user;

      let listName: string | null = null;
      let teamName: string | null = null;
      let teamId: string | null = null;
      if (listId) {
        const listRes = await cuGet(token, `/list/${listId}`);
        if (!listRes.ok) return json({ error: "Couldn't find that List. Check the List ID." }, 400);
        const list = await listRes.json();
        listName = list?.name ?? null;
        teamName = list?.space?.name ?? null;
      }

      const { error } = await admin.from("clickup_connections").upsert({
        tenant_id: tenantId,
        token,
        team_id: teamId,
        team_name: teamName,
        default_list_id: listId || null,
        default_list_name: listName,
        connected_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id" });
      if (error) return json({ error: error.message }, 500);

      return json({ connected: true, username: cuUser?.username ?? null, listName });
    }

    // ── disconnect ──────────────────────────────────────────────────────────
    if (action === "disconnect") {
      await admin.from("clickup_connections").delete().eq("tenant_id", tenantId);
      return json({ connected: false });
    }

    // ── push ────────────────────────────────────────────────────────────────
    if (action === "push") {
      const conn = await loadConn();
      if (!conn) return json({ error: "Connect ClickUp first." }, 400);
      if (!conn.default_list_id) return json({ error: "Set a ClickUp List in Settings first." }, 400);

      // Read the item through the USER client so RLS enforces access.
      const { data: item, error: itemErr } = await userClient
        .from("project_action_items")
        .select("*")
        .eq("id", body.actionItemId)
        .single();
      if (itemErr || !item) return json({ error: "Action item not found." }, 404);

      const payload: Record<string, unknown> = {
        name: item.title,
        description: item.description ?? "",
        priority: PRIORITY[item.priority] ?? 3,
      };
      if (item.due_date) payload.due_date = new Date(item.due_date + "T12:00:00Z").getTime();

      let taskId = item.clickup_task_id as string | null;
      let res: Response;
      if (taskId) {
        res = await fetch(`${CU}/task/${taskId}`, {
          method: "PUT",
          headers: { Authorization: conn.token, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${CU}/list/${conn.default_list_id}/task`, {
          method: "POST",
          headers: { Authorization: conn.token, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const t = await res.text();
        console.error("ClickUp push failed:", res.status, t);
        return json({ error: "ClickUp rejected the task. Check the List ID and token." }, 502);
      }
      const task = await res.json();
      taskId = taskId ?? task?.id ?? null;
      if (taskId && !item.clickup_task_id) {
        await admin.from("project_action_items").update({ clickup_task_id: taskId }).eq("id", item.id);
      }
      return json({ ok: true, taskId, url: task?.url ?? (taskId ? `https://app.clickup.com/t/${taskId}` : null) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("clickup error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
