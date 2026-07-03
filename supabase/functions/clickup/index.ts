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
        autoPush: !!conn?.auto_push,
        syncEnabled: !!conn?.webhook_id,
      });
    }

    // ── enable-sync ───────────────────────────────────────────────────────────
    // Register a ClickUp webhook so status changes flow back into Build OS.
    if (action === "enable-sync") {
      const conn = await loadConn();
      if (!conn) return json({ error: "Connect ClickUp first." }, 400);

      let teamId = conn.team_id as string | null;
      if (!teamId) {
        const tr = await cuGet(conn.token, "/team");
        const teams = tr.ok ? ((await tr.json())?.teams ?? []) : [];
        teamId = teams[0]?.id ? String(teams[0].id) : null;
        if (teamId) await admin.from("clickup_connections").update({ team_id: teamId, team_name: teams[0]?.name ?? conn.team_name }).eq("tenant_id", tenantId);
      }
      if (!teamId) return json({ error: "Couldn't find your ClickUp workspace." }, 400);

      if (conn.webhook_id) {
        await fetch(`${CU}/webhook/${conn.webhook_id}`, { method: "DELETE", headers: { Authorization: conn.token } }).catch(() => {});
      }
      const endpoint = `${url}/functions/v1/clickup-webhook`;
      const res = await fetch(`${CU}/team/${teamId}/webhook`, {
        method: "POST",
        headers: { Authorization: conn.token, "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, events: ["taskStatusUpdated", "taskUpdated", "taskDeleted"] }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("ClickUp webhook create failed:", res.status, t);
        return json({ error: "ClickUp couldn't register the webhook (your plan may not support webhooks)." }, 502);
      }
      const wh = await res.json();
      const webhook = wh?.webhook ?? wh;
      await admin.from("clickup_connections").update({
        webhook_id: String(webhook.id),
        webhook_secret: webhook.secret ?? null,
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenantId);
      return json({ syncEnabled: true });
    }

    // ── disable-sync ──────────────────────────────────────────────────────────
    if (action === "disable-sync") {
      const conn = await loadConn();
      if (conn?.webhook_id) {
        await fetch(`${CU}/webhook/${conn.webhook_id}`, { method: "DELETE", headers: { Authorization: conn.token } }).catch(() => {});
      }
      await admin.from("clickup_connections").update({ webhook_id: null, webhook_secret: null }).eq("tenant_id", tenantId);
      return json({ syncEnabled: false });
    }

    // ── set-auto-push ─────────────────────────────────────────────────────────
    if (action === "set-auto-push") {
      await admin.from("clickup_connections").update({ auto_push: !!body.value, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
      return json({ autoPush: !!body.value });
    }

    // ── lists ───────────────────────────────────────────────────────────────
    // Validate the token and enumerate pickable lists (Space / Folder / List)
    // so the user never has to hunt for a List ID. Token is passed in, not stored.
    if (action === "lists") {
      // Pre-connect: token passed in. Post-connect (e.g. per-project list picker):
      // fall back to the stored token so the user needn't re-enter it.
      let token = String(body.token ?? "").trim();
      if (!token) token = (await loadConn())?.token ?? "";
      if (!token) return json({ error: "Enter your ClickUp API token first." }, 400);

      const teamRes = await cuGet(token, "/team");
      if (!teamRes.ok) {
        const raw = await teamRes.text().catch(() => "");
        let reason = ""; try { reason = JSON.parse(raw)?.err || ""; } catch { reason = raw.slice(0, 120); }
        return json({ error: `ClickUp rejected the token (HTTP ${teamRes.status}${reason ? `: ${reason}` : ""}).` }, 400);
      }
      const teams = (await teamRes.json())?.teams ?? [];
      const out: Array<{ id: string; name: string; path: string }> = [];
      const CAP = 300;

      for (const team of teams) {
        if (out.length >= CAP) break;
        const spRes = await cuGet(token, `/team/${team.id}/space?archived=false`);
        const spaces = spRes.ok ? ((await spRes.json())?.spaces ?? []) : [];
        for (const space of spaces) {
          if (out.length >= CAP) break;
          // Folders carry their lists inline.
          const fRes = await cuGet(token, `/space/${space.id}/folder?archived=false`);
          const folders = fRes.ok ? ((await fRes.json())?.folders ?? []) : [];
          for (const folder of folders) {
            for (const list of (folder.lists ?? [])) {
              out.push({ id: String(list.id), name: list.name, path: `${space.name} / ${folder.name} / ${list.name}` });
            }
          }
          // Folderless lists.
          const lRes = await cuGet(token, `/space/${space.id}/list?archived=false`);
          const lists = lRes.ok ? ((await lRes.json())?.lists ?? []) : [];
          for (const list of lists) {
            out.push({ id: String(list.id), name: list.name, path: `${space.name} / ${list.name}` });
          }
        }
      }
      return json({ lists: out });
    }

    // ── connect ─────────────────────────────────────────────────────────────
    if (action === "connect") {
      const token = String(body.token ?? "").trim();
      const listId = String(body.listId ?? "").trim();
      if (!token) return json({ error: "Paste your ClickUp API token." }, 400);

      const userRes = await cuGet(token, "/user");
      if (!userRes.ok) {
        const raw = await userRes.text().catch(() => "");
        let reason = "";
        try { reason = JSON.parse(raw)?.err || ""; } catch { reason = raw.slice(0, 120); }
        return json({
          error: `ClickUp rejected the token (HTTP ${userRes.status}${reason ? `: ${reason}` : ""}). Use a personal API token from ClickUp → avatar → Settings → Apps (starts with "pk_").`,
        }, 400);
      }
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

      // Read the item through the USER client so RLS enforces access.
      const { data: item, error: itemErr } = await userClient
        .from("project_action_items")
        .select("*")
        .eq("id", body.actionItemId)
        .single();
      if (itemErr || !item) return json({ error: "Action item not found." }, 404);

      // Per-project List overrides the connection default.
      const { data: pmap } = await admin.from("clickup_project_lists").select("list_id").eq("project_id", item.project_id).maybeSingle();
      const listId = pmap?.list_id || conn.default_list_id;
      if (!listId) return json({ error: "Set a ClickUp list first." }, 400);

      // Resolve the assignee's ClickUp member id by matching email against the
      // list's members (Build OS user ids aren't ClickUp ids).
      let assigneeId: number | null = null;
      if (item.assigned_to) {
        const { data: prof } = await admin.from("profiles").select("email").eq("user_id", item.assigned_to).maybeSingle();
        const email = String(prof?.email ?? "").toLowerCase();
        if (email) {
          const mRes = await cuGet(conn.token, `/list/${listId}/member`);
          if (mRes.ok) {
            const members = (await mRes.json())?.members ?? [];
            const m = members.find((x: any) => String(x.email ?? "").toLowerCase() === email);
            if (m?.id != null) assigneeId = m.id;
          }
        }
      }

      const base: Record<string, unknown> = {
        name: item.title,
        description: item.description ?? "",
        priority: PRIORITY[item.priority] ?? 3,
      };
      if (item.due_date) base.due_date = new Date(item.due_date + "T12:00:00Z").getTime();

      let taskId = item.clickup_task_id as string | null;
      let res: Response;
      if (taskId) {
        // ClickUp update wants assignees as { add: [...] }.
        const body = assigneeId != null ? { ...base, assignees: { add: [assigneeId] } } : base;
        res = await fetch(`${CU}/task/${taskId}`, {
          method: "PUT",
          headers: { Authorization: conn.token, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        // ClickUp create wants assignees as a plain array.
        const body = assigneeId != null ? { ...base, assignees: [assigneeId] } : base;
        res = await fetch(`${CU}/list/${listId}/task`, {
          method: "POST",
          headers: { Authorization: conn.token, "Content-Type": "application/json" },
          body: JSON.stringify(body),
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

      // Sync new comments/updates as ClickUp comments (once each).
      if (taskId) {
        const { data: cmts } = await admin.from("action_item_comments")
          .select("id, content, clickup_comment_id").eq("action_item_id", item.id).order("created_at", { ascending: true });
        for (const c of (cmts ?? [])) {
          if (c.clickup_comment_id) continue;
          const cr = await fetch(`${CU}/task/${taskId}/comment`, {
            method: "POST",
            headers: { Authorization: conn.token, "Content-Type": "application/json" },
            body: JSON.stringify({ comment_text: c.content, notify_all: false }),
          });
          if (cr.ok) {
            const cd = await cr.json();
            const cid = cd?.id ?? cd?.comment?.id ?? null;
            if (cid != null) await admin.from("action_item_comments").update({ clickup_comment_id: String(cid) }).eq("id", c.id);
          }
        }
      }

      return json({ ok: true, taskId, assigned: assigneeId != null, url: task?.url ?? (taskId ? `https://app.clickup.com/t/${taskId}` : null) });
    }

    // ── create-note ─────────────────────────────────────────────────────────
    // Push a meeting agenda as ONE task in the project's list. If this meeting
    // already has an agenda task, UPDATE it in place (no duplicate clutter).
    if (action === "create-note") {
      const conn = await loadConn();
      if (!conn) return json({ error: "Connect ClickUp first." }, 400);
      let listId = conn.default_list_id as string | null;
      const projId = String(body.projectId ?? "");
      if (projId) {
        const { data: pmap } = await admin.from("clickup_project_lists").select("list_id").eq("project_id", projId).maybeSingle();
        listId = pmap?.list_id || conn.default_list_id;
      }
      if (!listId) return json({ error: "Set a ClickUp list first." }, 400);

      const name = String(body.title ?? "Meeting agenda");
      const markdown_content = String(body.content ?? "");
      const meetingId = String(body.meetingId ?? "");

      // Re-use the meeting's existing agenda task if we have one.
      let existingTaskId: string | null = null;
      if (meetingId) {
        const { data: mrow } = await admin.from("consulting_meetings").select("clickup_agenda_task_id").eq("id", meetingId).maybeSingle();
        existingTaskId = (mrow?.clickup_agenda_task_id as string | null) ?? null;
      }

      if (existingTaskId) {
        const up = await fetch(`${CU}/task/${existingTaskId}`, {
          method: "PUT",
          headers: { Authorization: conn.token, "Content-Type": "application/json" },
          body: JSON.stringify({ name, markdown_content }),
        });
        if (up.ok) {
          const task = await up.json();
          return json({ ok: true, updated: true, url: task?.url ?? null });
        }
        // Task was deleted in ClickUp (404) or otherwise stale — fall through to recreate.
        console.warn("ClickUp agenda update failed, recreating:", up.status, await up.text());
      }

      const res = await fetch(`${CU}/list/${listId}/task`, {
        method: "POST",
        headers: { Authorization: conn.token, "Content-Type": "application/json" },
        body: JSON.stringify({ name, markdown_content }),
      });
      if (!res.ok) { console.error("ClickUp create-note failed:", res.status, await res.text()); return json({ error: "ClickUp rejected the note." }, 502); }
      const task = await res.json();
      if (meetingId && task?.id) {
        await admin.from("consulting_meetings").update({ clickup_agenda_task_id: String(task.id) }).eq("id", meetingId);
      }
      return json({ ok: true, updated: false, url: task?.url ?? null });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("clickup error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
