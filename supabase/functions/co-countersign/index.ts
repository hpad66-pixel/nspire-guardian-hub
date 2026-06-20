// Public, token-gated counter-sign endpoint for change orders.
// GET  ?token=<uuid>           → returns CO summary + signed PDF URL (no auth).
// POST { token, signature, name } → records the client's acceptance and executes the CO.
// The sign_token is the capability; service role is used to bypass RLS for this
// single token-scoped row only.
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token") ?? "";
      if (!UUID.test(token)) return json({ error: "Invalid token" }, 400);
      const { data, error } = await admin
        .from("change_orders")
        .select("id, co_no, co_type, title, amount, status, pdf_path, spec, accepted_signed_at, locked")
        .eq("sign_token", token)
        .maybeSingle();
      if (error || !data) return json({ error: "Not found" }, 404);
      const spec = (data.spec ?? {}) as any;
      return json({
        co_label: spec?.doc?.co_label ?? `${data.co_type}-${data.co_no}`,
        title: data.title,
        amount: data.amount,
        pdf_url: data.pdf_path,
        project: spec?.parties?.project ?? "",
        from: spec?.parties?.from?.name ?? "",
        to: spec?.parties?.to?.name ?? "",
        accepted: Boolean(data.accepted_signed_at),
        signable: Boolean(data.locked) && !data.accepted_signed_at,
      });
    }

    if (req.method === "POST") {
      const { token, signature, name } = await req.json();
      if (!UUID.test(token ?? "")) return json({ error: "Invalid token" }, 400);
      if (!signature || typeof signature !== "string" || !signature.startsWith("data:image"))
        return json({ error: "Signature required" }, 400);

      const { data: co, error: e1 } = await admin
        .from("change_orders")
        .select("id, tenant_id, project_id, co_no, co_type, title, spec, locked, accepted_signed_at, created_by, submitted_signed_by")
        .eq("sign_token", token)
        .maybeSingle();
      if (e1 || !co) return json({ error: "Not found" }, 404);
      if (!co.locked) return json({ error: "Not ready for signature" }, 409);
      if (co.accepted_signed_at) return json({ error: "Already signed" }, 409);

      // Store the client's signature image.
      const bytes = Uint8Array.from(atob(signature.split(",")[1]), (c) => c.charCodeAt(0));
      const path = `${co.tenant_id}/${co.project_id}/change-orders/sig/${crypto.randomUUID()}.png`;
      await admin.storage.from("daily-report-files").upload(path, bytes, { contentType: "image/png" });
      const sigUrl = admin.storage.from("daily-report-files").getPublicUrl(path).data.publicUrl;

      const spec = (co.spec ?? {}) as any;
      // NB: do NOT mutate `spec` here — the lock guard freezes signed content.
      // The acceptance lives in the accepted_* columns.
      const { error: e2 } = await admin
        .from("change_orders")
        .update({
          accepted_signature_path: sigUrl,
          accepted_signed_at: new Date().toISOString(),
          accepted_signed_name: name ?? null,
          status: "executed",
          executed_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", co.id);
      if (e2) return json({ error: e2.message }, 500);

      // Drop a notification into the originator's in-app inbox.
      const notifyUser = co.submitted_signed_by ?? co.created_by;
      if (notifyUser) {
        await admin.from("notifications").insert({
          user_id: notifyUser,
          type: "change_order_accepted",
          title: "Change order accepted",
          message: `${spec?.doc?.co_label ?? `${co.co_type}-${co.co_no}`} — ${co.title} was accepted${name ? ` by ${name}` : ""}.`,
          entity_type: "change_order",
          entity_id: co.id,
        });
      }
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
