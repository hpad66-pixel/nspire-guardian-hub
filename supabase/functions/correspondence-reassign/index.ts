// correspondence-reassign (PR3p) — correct a synced thread: move it to the right
// project and/or its topic, and optionally push the matching Gmail label. Handles
// the case where the same underlying message already exists under the target
// project (the per-project unique index means a message can legitimately live in
// more than one project — moving just drops the now-redundant source row instead
// of trying to insert a duplicate).
// POST { project_id, gmail_thread_id, target_project_id?, topic?, apply_gmail_label? }
//   → { moved, movedRows, droppedRows, labelApplied, labelSkippedReason? }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { refreshAccessToken } from "../_shared/gmailOAuth.ts";
import { modifyThreadLabels } from "../_shared/gmailApi.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: prof } = await admin.from("profiles").select("workspace_id").eq("user_id", user.id).maybeSingle();
    const tenantId = prof?.workspace_id as string | undefined;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const projectId = String(body.project_id ?? "");
    const threadId = String(body.gmail_thread_id ?? "");
    if (!projectId || !threadId) return json({ error: "project_id and gmail_thread_id are required" }, 400);
    const targetProjectId = body.target_project_id ? String(body.target_project_id) : projectId;
    const topic = typeof body.topic === "string" && body.topic ? body.topic : null;
    const applyLabel = Boolean(body.apply_gmail_label);

    // Authz: the caller must be able to see both projects (RLS-enforced via the user client).
    const { data: srcProject } = await userClient.from("projects").select("id").eq("id", projectId).maybeSingle();
    if (!srcProject) return json({ error: "Source project not found" }, 404);
    if (targetProjectId !== projectId) {
      const { data: dstProject } = await userClient.from("projects").select("id").eq("id", targetProjectId).maybeSingle();
      if (!dstProject) return json({ error: "Target project not found" }, 404);
    }

    const { data: rows } = await admin.from("project_emails").select("id,gmail_message_id,topic")
      .eq("project_id", projectId).eq("gmail_thread_id", threadId);
    if (!rows || rows.length === 0) return json({ error: "No messages found for this thread in the source project" }, 404);

    let movedRows = 0, droppedRows = 0;
    const moving = targetProjectId !== projectId;

    if (moving) {
      // A message can legitimately live in more than one project — if it's
      // already present under the target, the source copy is now redundant.
      const { data: existingTarget } = await admin.from("project_emails").select("gmail_message_id")
        .eq("project_id", targetProjectId).not("gmail_message_id", "is", null);
      const already = new Set((existingTarget ?? []).map((r) => r.gmail_message_id as string));

      for (const row of rows) {
        if (row.gmail_message_id && already.has(row.gmail_message_id)) {
          await admin.from("project_emails").delete().eq("id", row.id);
          droppedRows++;
        } else {
          const patch: Record<string, unknown> = { project_id: targetProjectId, tenant_id: tenantId, updated_at: new Date().toISOString() };
          if (topic) patch.topic = topic;
          const { error } = await admin.from("project_emails").update(patch).eq("id", row.id);
          if (!error) movedRows++;
        }
      }
      // Stale intel for the OLD project/thread no longer applies — drop it so the
      // thread doesn't show wrong-project analysis; re-run Analyze under the new project.
      await admin.from("correspondence_threads").delete().eq("project_id", projectId).eq("gmail_thread_id", threadId);
    } else if (topic) {
      const ids = rows.map((r) => r.id);
      const { error } = await admin.from("project_emails").update({ topic, updated_at: new Date().toISOString() }).in("id", ids);
      if (!error) movedRows = ids.length;
      await admin.from("correspondence_threads").update({ topic }).eq("project_id", projectId).eq("gmail_thread_id", threadId);
    }

    let labelApplied = false, labelSkippedReason: string | undefined;
    if (applyLabel) {
      const { data: settings } = await admin.from("correspondence_settings").select("gmail_label_id").eq("project_id", targetProjectId).maybeSingle();
      const labelId = settings?.gmail_label_id as string | undefined;
      if (!labelId) {
        labelSkippedReason = "This project has no Gmail label configured yet.";
      } else {
        const { data: conn } = await admin.from("gmail_connections").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle();
        if (!conn || conn.status !== "active" || !conn.refresh_token) {
          labelSkippedReason = "Gmail is not connected.";
        } else {
          try {
            const { access_token } = await refreshAccessToken(conn.refresh_token);
            await modifyThreadLabels(access_token, threadId, [labelId]);
            labelApplied = true;
          } catch (e) {
            labelSkippedReason = e instanceof Error ? e.message : "Couldn't apply the Gmail label.";
          }
        }
      }
    }

    return json({ moved: moving, movedRows, droppedRows, labelApplied, labelSkippedReason });
  } catch (e) {
    console.error("correspondence-reassign error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
