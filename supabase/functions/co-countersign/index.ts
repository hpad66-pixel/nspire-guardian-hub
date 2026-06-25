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
        .select("id, co_no, co_type, title, amount, status, pdf_path, spec, accepted_signed_at, accepted_signature_path, accepted_signed_name, client_comments, locked, submitted_signature_path")
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
        status: data.status,
        accepted: Boolean(data.accepted_signed_at),
        rejected: data.status === "rejected",
        signable: Boolean(data.locked) && !data.accepted_signed_at && data.status !== "rejected",
        client_comments: data.client_comments ?? null,
        spec: data.spec ?? null,
        submitted_signature_path: data.submitted_signature_path ?? null,
        accepted_signature_path: data.accepted_signature_path ?? null,
      });
    }

    if (req.method === "POST") {
      const { token, signature, name, action, comments } = await req.json();
      if (!UUID.test(token ?? "")) return json({ error: "Invalid token" }, 400);
      const isReject = action === "reject";

      const { data: co, error: e1 } = await admin
        .from("change_orders")
        .select("id, tenant_id, project_id, co_no, co_type, title, amount, spec, pdf_path, locked, accepted_signed_at, status, submitted_signed_by")
        .eq("sign_token", token)
        .maybeSingle();
      if (e1 || !co) return json({ error: "Not found" }, 404);
      if (!co.locked) return json({ error: "Not ready for signature" }, 409);
      if (co.accepted_signed_at) return json({ error: "Already signed" }, 409);
      if (co.status === "rejected") return json({ error: "Already responded" }, 409);

      const spec = (co.spec ?? {}) as any;
      const label = spec?.doc?.co_label ?? `${co.co_type}-${co.co_no}`;
      const clientEmail = spec?.parties?.to?.email as string | undefined;
      const contractorEmail = spec?.parties?.from?.email as string | undefined;
      const contractorName = spec?.parties?.from?.name || "Change Orders";
      const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(n) || 0);

      async function sendMail(to: string | undefined, fromName: string, subject: string, html: string) {
        const RESEND = Deno.env.get("RESEND_API_KEY");
        if (!RESEND || !to) return;
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: `${fromName} <hardeep@apas.ai>`, to: [to], subject, html }),
          });
        } catch (_) { /* email is best-effort */ }
      }

      // ── REJECT with comments ────────────────────────────────────
      if (isReject) {
        if (!comments || String(comments).trim().length < 2) return json({ error: "Please add a comment explaining the rejection." }, 400);
        const { error: er } = await admin
          .from("change_orders")
          .update({ status: "rejected", client_comments: String(comments).trim(), accepted_signed_name: name ?? null })
          .eq("id", co.id);
        if (er) return json({ error: er.message }, 500);

        if (co.submitted_signed_by) {
          await admin.from("notifications").insert({
            user_id: co.submitted_signed_by,
            type: "change_order_rejected",
            title: "Change order rejected",
            message: `${label} — ${co.title} was rejected${name ? ` by ${name}` : ""}: "${String(comments).trim()}"`,
            entity_type: "change_order", entity_id: co.id,
          });
        }
        await sendMail(contractorEmail, name || "Client",
          `${label} rejected — ${co.title}`,
          `<div style="font-family:Georgia,serif;color:#1A1714"><p><b>${label} — ${co.title}</b> was <b>rejected</b>${name ? ` by ${name}` : ""}.</p><p style="background:#fdf2f2;border-left:3px solid #F43F5E;padding:10px 14px"><b>Comments:</b><br>${String(comments).trim().replace(/</g, "&lt;")}</p><p style="color:#6B6B6B">Revise the change order and re-send, or follow up directly.</p></div>`);
        return json({ ok: true, rejected: true });
      }

      // ── ACCEPT & sign ───────────────────────────────────────────
      if (!signature || typeof signature !== "string" || !signature.startsWith("data:image"))
        return json({ error: "Signature required" }, 400);
      const bytes = Uint8Array.from(atob(signature.split(",")[1]), (c) => c.charCodeAt(0));
      const path = `${co.tenant_id}/${co.project_id}/change-orders/sig/${crypto.randomUUID()}.png`;
      await admin.storage.from("daily-report-files").upload(path, bytes, { contentType: "image/png" });
      const sigUrl = admin.storage.from("daily-report-files").getPublicUrl(path).data.publicUrl;

      const { error: e2 } = await admin
        .from("change_orders")
        .update({
          accepted_signature_path: sigUrl,
          accepted_signed_at: new Date().toISOString(),
          accepted_signed_name: name ?? null,
          client_comments: comments ? String(comments).trim() : null,
          status: "executed",
          executed_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", co.id);
      if (e2) return json({ error: e2.message }, 500);

      if (co.submitted_signed_by) {
        await admin.from("notifications").insert({
          user_id: co.submitted_signed_by,
          type: "change_order_accepted",
          title: "Change order executed",
          message: `${label} — ${co.title} was accepted and executed${name ? ` by ${name}` : ""}.`,
          entity_type: "change_order", entity_id: co.id,
        });
      }

      // Automatic fully-executed confirmation to BOTH parties.
      const execHtml = `<div style="font-family:Georgia,serif;color:#1A1714">
        <p><b>${label} — ${co.title}</b> is now <b>fully executed</b>.</p>
        <p>Amount: <b>${money(co.amount)}</b>${name ? ` · Accepted by ${name}` : ""} · ${new Date().toLocaleDateString()}</p>
        ${co.pdf_path ? `<p><a href="${co.pdf_path}">View the executed change order</a></p>` : ""}
        <p style="color:#6B6B6B">This is an automatic confirmation that both parties have signed.</p></div>`;
      await sendMail(clientEmail, contractorName, `${label} executed — ${co.title}`, execHtml);
      await sendMail(contractorEmail, contractorName, `${label} executed — ${co.title}`, execHtml);

      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
