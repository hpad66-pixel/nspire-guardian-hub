// Public, token-gated action-item card for CRM / external assignees.
// GET  ?token=<uuid> → card summary
// POST { token, status, comment } → update status / add comment
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED = new Set(["todo", "in_progress", "in_review", "done"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token") ?? "";
      if (!UUID.test(token)) return json({ error: "Invalid token" }, 400);
      const { data, error } = await admin
        .from("project_action_items")
        .select("id, title, description, status, priority, due_date, created_at, assigned_to, assigned_contact_id, project_id, projects(name)")
        .eq("access_token", token)
        .maybeSingle();
      if (error || !data) return json({ error: "Not found" }, 404);

      let assigneeName: string | null = null;
      if (data.assigned_contact_id) {
        const { data: contact } = await admin
          .from("crm_contacts")
          .select("first_name, last_name, email")
          .eq("id", data.assigned_contact_id)
          .maybeSingle();
        assigneeName = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || contact?.email || null;
      } else if (data.assigned_to) {
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", data.assigned_to)
          .maybeSingle();
        assigneeName = profile?.full_name || profile?.email || null;
      }

      const { data: comments } = await admin
        .from("action_item_comments")
        .select("id, content, created_at, created_by")
        .eq("action_item_id", data.id)
        .order("created_at", { ascending: true })
        .limit(20);

      return json({
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date,
        created_at: data.created_at,
        project: (data as any).projects?.name ?? "",
        assignee_name: assigneeName,
        comments: (comments ?? []).map((c: any) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
        })),
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const token = String(body.token ?? "");
      if (!UUID.test(token)) return json({ error: "Invalid token" }, 400);

      const { data: item, error } = await admin
        .from("project_action_items")
        .select("id, status, created_by")
        .eq("access_token", token)
        .maybeSingle();
      if (error || !item) return json({ error: "Not found" }, 404);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.status) {
        if (!ALLOWED.has(String(body.status))) return json({ error: "Invalid status" }, 400);
        updates.status = body.status;
        updates.completed_at = body.status === "done" ? new Date().toISOString() : null;
      }

      if (Object.keys(updates).length > 1) {
        const { error: eu } = await admin.from("project_action_items").update(updates).eq("id", item.id);
        if (eu) return json({ error: eu.message }, 500);
      }

      if (body.comment && String(body.comment).trim()) {
        await admin.from("action_item_comments").insert({
          action_item_id: item.id,
          content: String(body.comment).trim(),
          created_by: item.created_by,
        });
      }

      return json({ ok: true, status: updates.status ?? item.status });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("action-item-public error:", error);
    return json({ error: error instanceof Error ? error.message : "Failed" }, 500);
  }
});
