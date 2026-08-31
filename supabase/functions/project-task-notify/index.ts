// Authenticated fan-out for project instructions:
// 1) Immediate browser/phone push to accountable participants (internal users)
// 2) Branded assignment email card to the owner (internal profile OR CRM contact)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildAssignmentHtml(input: {
  brand: string;
  projectName: string;
  taskTitle: string;
  description?: string | null;
  assigneeName: string;
  assignedByName?: string | null;
  assignedAt: string;
  dueDate?: string | null;
  priority?: string | null;
  actionUrl: string;
  hasPortalAccess: boolean;
}) {
  const due = input.dueDate
    ? new Date(`${input.dueDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "No due date";
  const assignedAt = new Date(input.assignedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const priority = (input.priority || "medium").toUpperCase();
  const description = (input.description || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 10px;color:#3f3c38;line-height:1.55;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta = input.hasPortalAccess ? "Open in portal" : "Open action card";

  return `<div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1A1714;font-size:14px;line-height:1.55;background:#FDFCF9;padding:24px 16px;">
  <div style="background:#fff;border:1px solid #E8E4DC;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0D3B30 0%,#1A1714 70%);padding:22px 24px;color:#FAF8F4;">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Action item assigned</div>
      <div style="font-size:24px;font-weight:700;margin-top:6px;">${esc(input.brand)}</div>
      ${input.projectName ? `<div style="margin-top:4px;font-size:13px;color:#D9D4CB;">${esc(input.projectName)}</div>` : ""}
    </div>
    <div style="padding:24px;">
      <div style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;color:#1D6FE8;background:#DCEAFE;">${esc(priority)} PRIORITY</div>
      <h1 style="margin:14px 0 0;font-size:20px;line-height:1.35;font-weight:800;">${esc(input.taskTitle)}</h1>
      ${description ? `<div style="margin-top:14px;">${description}</div>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-top:18px;background:#FAF8F4;border-radius:12px;">
        <tr><td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;width:40%;font-size:12px;color:#878581;">ASSIGNED TO</td><td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-weight:600;">${esc(input.assigneeName)}</td></tr>
        <tr><td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-size:12px;color:#878581;">ASSIGNED ON</td><td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;">${esc(assignedAt)}</td></tr>
        <tr><td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-size:12px;color:#878581;">DUE DATE</td><td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-weight:700;">${esc(due)}</td></tr>
        ${input.assignedByName ? `<tr><td style="padding:12px 14px;font-size:12px;color:#878581;">FROM</td><td style="padding:12px 14px;">${esc(input.assignedByName)}</td></tr>` : ""}
      </table>
      <div style="margin-top:22px;text-align:center;">
        <a href="${esc(input.actionUrl)}" style="display:inline-block;background:#1D6FE8;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">${esc(cta)}</a>
      </div>
      <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#878581;">
        ${input.hasPortalAccess
          ? "Opens your project portal on this action card."
          : "Opens a secure action card — no app login required."}
      </p>
    </div>
  </div>
</div>`;
}

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

    const { data: item, error: itemError } = await userClient
      .from("project_action_items")
      .select("id,project_id,title,description,status,priority,due_date,assigned_to,assigned_contact_id,access_token,created_by,created_at")
      .eq("id", actionItemId)
      .maybeSingle();
    if (itemError || !item) return json({ error: "Project instruction not found" }, 404);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: project } = await admin.from("projects").select("name").eq("id", item.project_id).maybeSingle();
    const { data: watchers } = await admin.from("project_action_item_watchers").select("user_id").eq("action_item_id", item.id);
    const { data: actorProfile } = await admin.from("profiles").select("full_name, email").eq("user_id", actor.id).maybeSingle();

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
    const appUrl = `/projects/${item.project_id}?tab=action-items&item=${item.id}`;
    const origin = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://projos.ai";

    let sent = 0;
    for (const userId of recipients) {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, title, body: pushBody, url: appUrl }),
      }).catch(() => null);
      if (!response?.ok) continue;
      const result = await response.json().catch(() => ({}));
      sent += Number(result?.sent ?? 0);
    }

    // Branded assignment email to the accountable owner (user or CRM contact)
    let emailSent = false;
    if (event === "assignment") {
      let email: string | null = null;
      let assigneeName = "there";
      let actionUrl = `${origin}${appUrl}`;
      let hasPortalAccess = true;

      if (item.assigned_contact_id) {
        const { data: contact } = await admin
          .from("crm_contacts")
          .select("first_name, last_name, email")
          .eq("id", item.assigned_contact_id)
          .maybeSingle();
        email = contact?.email ?? null;
        assigneeName = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || contact?.email || "there";
        actionUrl = `${origin}/action/${item.access_token}`;
        hasPortalAccess = false;

        // If this CRM contact also has portal access on the project, prefer portal deep-link
        const { data: portal } = await admin
          .from("client_portals")
          .select("id, portal_slug")
          .eq("project_id", item.project_id)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (portal?.portal_slug && email) {
          const { data: access } = await admin
            .from("portal_access")
            .select("id")
            .eq("portal_id", portal.id)
            .eq("email", email)
            .eq("is_active", true)
            .maybeSingle();
          if (access) {
            actionUrl = `${origin}/portal/${portal.portal_slug}?item=${item.id}`;
            hasPortalAccess = true;
          }
        }
      } else if (item.assigned_to && item.assigned_to !== actor.id) {
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name, email, work_email")
          .eq("user_id", item.assigned_to)
          .maybeSingle();
        email = (profile?.work_email || profile?.email) ?? null;
        assigneeName = profile?.full_name || profile?.email || "there";
        actionUrl = `${origin}${appUrl}`;
        hasPortalAccess = true;
      }

      if (email) {
        const html = buildAssignmentHtml({
          brand: "APAS",
          projectName: project?.name || "",
          taskTitle: item.title,
          description: item.description,
          assigneeName,
          assignedByName: actorProfile?.full_name || actorProfile?.email || null,
          assignedAt: item.created_at || new Date().toISOString(),
          dueDate: item.due_date,
          priority: item.priority,
          actionUrl,
          hasPortalAccess,
        });
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "APAS Consulting <hardeep@apas.ai>",
              to: [email],
              subject: `Action item: ${item.title}${project?.name ? ` — ${project.name}` : ""}`,
              html,
            }),
          });
          emailSent = resp.ok;
          if (emailSent) {
            await admin
              .from("project_action_items")
              .update({ assignment_email_sent_at: new Date().toISOString() })
              .eq("id", item.id);
          }
        }
      }
    }

    return json({ ok: true, recipients: recipients.length, sent, emailSent });
  } catch (error) {
    console.error("project-task-notify error:", error);
    return json({ error: error instanceof Error ? error.message : "Notification failed" }, 500);
  }
});
