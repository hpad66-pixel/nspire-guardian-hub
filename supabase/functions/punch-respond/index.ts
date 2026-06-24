// Token-gated punch list response flow for the (unauthenticated) subcontractor:
//  GET  ?token=...                                  → fetch the transmittal + items
//  POST { token, action:"view" }                    → stamp viewed_at (first open)
//  POST { token, action:"respond", responder_name,
//         responder_email, responses:[{punch_item_id, sub_status, comment}] }
//                                                    → append responses + roll up
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const VALID = ["acknowledged", "in_progress", "completed", "disputed"];

function renderPayload(tx: any, items: any[], latest: Record<string, any>) {
  return {
    project: tx.projects?.name ?? "",
    recipient: tx.recipient_name, subject: tx.subject, message: tx.message,
    status: tx.status, sentAt: tx.sent_at, respondedAt: tx.responded_at,
    items: items.map((i: any) => ({
      id: i.id, description: i.description, location: i.location, priority: i.priority,
      gcStatus: i.status, lastStatus: latest[i.id]?.sub_status ?? null, lastComment: latest[i.id]?.comment ?? null,
    })),
  };
}

async function loadByToken(db: any, token: string) {
  const { data: tx } = await db.from("punch_transmittals")
    .select("id, tenant_id, project_id, recipient_name, recipient_email, subject, message, status, item_count, sent_at, viewed_at, responded_at, projects(name)")
    .eq("respond_token", token).maybeSingle();
  if (!tx) return null;
  const { data: links } = await db.from("punch_transmittal_items")
    .select("punch_item_id, punch_items(id, description, location, priority, status, sub_status, sub_responded_at)")
    .eq("transmittal_id", tx.id);
  const items = (links ?? []).map((l: any) => l.punch_items).filter(Boolean);
  // Most recent response per item, so a returning sub sees what they last said.
  const ids = items.map((i: any) => i.id);
  let latest: Record<string, any> = {};
  if (ids.length) {
    const { data: resp } = await db.from("punch_item_responses")
      .select("punch_item_id, sub_status, comment, responded_at")
      .in("punch_item_id", ids).order("responded_at", { ascending: false });
    for (const r of resp ?? []) if (!latest[r.punch_item_id]) latest[r.punch_item_id] = r;
  }
  return { tx, items, latest };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = admin();
  try {
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token");
      if (!token) return json({ error: "token required" }, 400);
      const loaded = await loadByToken(db, token);
      if (!loaded) return json({ error: "This punch list link was not found." }, 404);
      return json(renderPayload(loaded.tx, loaded.items, loaded.latest));
    }

    const body = await req.json();
    const { token, action } = body;
    if (!token) return json({ error: "token required" }, 400);
    const loaded = await loadByToken(db, token);
    if (!loaded) return json({ error: "This punch list link was not found." }, 404);
    const { tx } = loaded;

    if (action === "get") {
      return json(renderPayload(loaded.tx, loaded.items, loaded.latest));
    }

    if (action === "view") {
      if (!tx.viewed_at) {
        await db.from("punch_transmittals").update({
          viewed_at: new Date().toISOString(),
          status: tx.status === "sent" ? "viewed" : tx.status,
        }).eq("id", tx.id);
      }
      return json({ ok: true });
    }

    if (action === "respond") {
      const { responder_name, responder_email, responses } = body;
      if (!Array.isArray(responses) || responses.length === 0) return json({ error: "No responses provided." }, 400);
      const allowedIds = new Set(loaded.items.map((i: any) => i.id));
      const now = new Date().toISOString();
      const rows = responses
        .filter((r: any) => allowedIds.has(r.punch_item_id) && VALID.includes(r.sub_status))
        .map((r: any) => ({
          tenant_id: tx.tenant_id, transmittal_id: tx.id, punch_item_id: r.punch_item_id,
          responder_name: responder_name ?? null, responder_email: responder_email ?? null,
          sub_status: r.sub_status, comment: (r.comment ?? "").trim() || null, responded_at: now,
        }));
      if (!rows.length) return json({ error: "No valid responses." }, 400);

      const { error: insErr } = await db.from("punch_item_responses").insert(rows);
      if (insErr) return json({ error: insErr.message }, 500);

      // Cache the latest status on each item for fast GC-side reads.
      for (const r of rows) {
        await db.from("punch_items").update({ sub_status: r.sub_status, sub_responded_at: now }).eq("id", r.punch_item_id);
      }
      await db.from("punch_transmittals").update({ status: "responded", responded_at: now }).eq("id", tx.id);
      return json({ ok: true, recorded: rows.length });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
