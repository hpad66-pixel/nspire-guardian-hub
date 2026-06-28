// Public, slug-scoped client-portal WRITE actions. The client is a magic-link
// user (no Supabase account), so this service-role function performs the few
// writes a client may make — ask a question, respond to an action item, mark an
// item viewed — each validated against the portal's own project so a slug can
// never touch another tenant's data.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const { slug, action } = body as { slug?: string; action?: string };
    if (!slug || !action) return json({ error: "Missing slug or action" }, 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: portal } = await db.from("client_portals")
      .select("id, project_id, name, is_active")
      .eq("portal_slug", slug).maybeSingle();
    if (!portal || portal.is_active === false) return json({ error: "Portal not found" }, 404);

    if (action === "ask_question") {
      const subject = String(body.subject ?? "").trim();
      const message = String(body.message ?? "").trim();
      if (!message) return json({ error: "Empty question" }, 400);
      const { error } = await db.from("portal_document_requests").insert({
        portal_id: portal.id,
        request_type: "clarification",
        subject: subject || message.slice(0, 80),
        message,
        requested_by_email: String(body.email ?? "client@portal").toLowerCase(),
        requested_by_name: body.name ? String(body.name) : null,
        status: "pending",
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "respond_action_item" || action === "mark_viewed") {
      const itemId = String(body.item_id ?? "");
      if (!itemId) return json({ error: "Missing item_id" }, 400);
      // Ownership: the item must belong to THIS portal's project.
      const { data: item } = await db.from("client_action_items")
        .select("id, project_id, status").eq("id", itemId).maybeSingle();
      if (!item || item.project_id !== portal.project_id) return json({ error: "Not found" }, 404);

      const now = new Date().toISOString();
      if (action === "mark_viewed") {
        if (item.status === "pending") {
          await db.from("client_action_items").update({ status: "viewed", viewed_at: now }).eq("id", itemId);
        }
        return json({ ok: true });
      }
      // respond
      const patch: Record<string, unknown> = { status: "responded", responded_at: now, viewed_at: now };
      if (body.response != null) patch.client_response = String(body.response);
      if (body.selection != null) patch.client_selection = String(body.selection);
      const { error } = await db.from("client_action_items").update(patch).eq("id", itemId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
