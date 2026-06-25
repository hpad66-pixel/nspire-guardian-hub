// Public, token-gated counter-sign endpoint for proposals. Mirrors co-countersign.
// GET  ?token=<uuid>              → proposal summary (title, html, status) — no auth.
// POST { token, signature, name } → records the recipient's e-signature.
// The sign_token is the capability; service role bypasses RLS for that row only.
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
        .from("project_proposals")
        .select("id, title, content_html, status, recipient_name, recipient_company, signed_at, signed_name, signature_path, project:projects(name)")
        .eq("sign_token", token)
        .maybeSingle();
      if (error || !data) return json({ error: "Not found" }, 404);
      return json({
        title: data.title,
        content_html: data.content_html ?? "",
        project: (data.project as { name?: string } | null)?.name ?? "",
        recipient_name: data.recipient_name ?? "",
        recipient_company: data.recipient_company ?? "",
        status: data.status,
        signed: Boolean(data.signed_at),
        signed_name: data.signed_name ?? null,
        signature_path: data.signature_path ?? null,
        // Only documents that were actually sent are signable.
        signable: !data.signed_at && (data.status === "sent"),
      });
    }

    if (req.method === "POST") {
      const { token, signature, name } = await req.json();
      if (!UUID.test(token ?? "")) return json({ error: "Invalid token" }, 400);

      const { data: p, error: e1 } = await admin
        .from("project_proposals")
        .select("id, project_id, title, status, recipient_email, signed_at")
        .eq("sign_token", token)
        .maybeSingle();
      if (e1 || !p) return json({ error: "Not found" }, 404);
      if (p.signed_at) return json({ error: "Already signed" }, 409);
      if (p.status !== "sent") return json({ error: "Not ready for signature" }, 409);

      if (!signature || typeof signature !== "string" || !signature.startsWith("data:image"))
        return json({ error: "Signature required" }, 400);
      if (!name || String(name).trim().length < 2)
        return json({ error: "Please enter your name." }, 400);

      const bytes = Uint8Array.from(atob(signature.split(",")[1]), (c) => c.charCodeAt(0));
      const path = `${p.project_id}/proposals/sig/${crypto.randomUUID()}.png`;
      await admin.storage.from("daily-report-files").upload(path, bytes, { contentType: "image/png" });
      const sigUrl = admin.storage.from("daily-report-files").getPublicUrl(path).data.publicUrl;

      const { error: e2 } = await admin
        .from("project_proposals")
        .update({
          signature_path: sigUrl,
          signed_at: new Date().toISOString(),
          signed_name: String(name).trim(),
        })
        .eq("id", p.id);
      if (e2) return json({ error: e2.message }, 500);

      // Best-effort confirmation email to the recipient.
      const RESEND = Deno.env.get("RESEND_API_KEY");
      if (RESEND && p.recipient_email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "APAS <hardeep@apas.ai>",
              to: [p.recipient_email],
              subject: `Signed — ${p.title}`,
              html: `<div style="font-family:Georgia,serif;color:#1A1714"><p><b>${p.title}</b> has been signed by ${String(name).trim()}.</p><p style="color:#6B6B6B">This is an automatic confirmation. Thank you.</p></div>`,
            }),
          });
        } catch (_) { /* email is best-effort */ }
      }

      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
