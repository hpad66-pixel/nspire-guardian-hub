// Public, token-gated counter-sign endpoint for authored correspondence documents.
// GET  ?token=<uuid> → document summary (no auth)
// POST { token, signature, name, action } → records client acceptance / rejection
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
        .from("authored_documents")
        .select("id, title, project_id, mime_type, source_file_name, workflow_status, contractor_signed_at, contractor_signed_name, contractor_signature_data, client_signed_at, client_signed_name, sent_to_client_at, original_base64, edited_html, content_html, projects(name)")
        .eq("sign_token", token)
        .maybeSingle();
      if (error || !data) return json({ error: "Not found" }, 404);
      const project = (data as any).projects;
      return json({
        title: data.title,
        project: project?.name ?? "",
        mime_type: data.mime_type,
        source_file_name: data.source_file_name,
        contractor_signed_at: data.contractor_signed_at,
        contractor_signed_name: data.contractor_signed_name,
        contractor_signature_data: data.contractor_signature_data,
        client_signed_at: data.client_signed_at,
        client_signed_name: data.client_signed_name,
        accepted: Boolean(data.client_signed_at),
        signable: Boolean(data.contractor_signed_at) && !data.client_signed_at,
        preview_html: data.edited_html || data.content_html || null,
        has_pdf: Boolean(data.original_base64 && String(data.mime_type || "").includes("pdf")),
        pdf_base64: data.original_base64 && String(data.mime_type || "").includes("pdf") ? data.original_base64 : null,
      });
    }

    if (req.method === "POST") {
      const { token, signature, name, action, comments } = await req.json();
      if (!UUID.test(token ?? "")) return json({ error: "Invalid token" }, 400);

      const { data: doc, error: e1 } = await admin
        .from("authored_documents")
        .select("id, title, project_id, contractor_signed_at, client_signed_at, sent_to_email, projects(name)")
        .eq("sign_token", token)
        .maybeSingle();
      if (e1 || !doc) return json({ error: "Not found" }, 404);
      if (!doc.contractor_signed_at) return json({ error: "Not ready for signature" }, 409);
      if (doc.client_signed_at) return json({ error: "Already signed" }, 409);

      if (action === "reject") {
        if (!comments || String(comments).trim().length < 2) {
          return json({ error: "Please add a comment explaining the rejection." }, 400);
        }
        const { error: er } = await admin
          .from("authored_documents")
          .update({
            workflow_status: "signed",
            client_signed_name: name ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", doc.id);
        if (er) return json({ error: er.message }, 500);
        return json({ ok: true, rejected: true });
      }

      if (!signature || !name?.trim()) return json({ error: "Signature and name required" }, 400);
      const { error: eu } = await admin
        .from("authored_documents")
        .update({
          client_signed_at: new Date().toISOString(),
          client_signed_name: String(name).trim(),
          client_signature_data: signature,
          workflow_status: "executed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
      if (eu) return json({ error: eu.message }, 500);

      // Best-effort notice to sender trail
      try {
        const projectName = (doc as any).projects?.name ?? "Project";
        await admin.from("project_emails").insert({
          project_id: doc.project_id,
          direction: "inbound",
          status: "received",
          channel: "esign",
          subject: `Signed: ${doc.title}`,
          from_email: doc.sent_to_email ?? null,
          to_emails: [],
          snippet: `${String(name).trim()} signed “${doc.title}” for ${projectName}`,
          body_text: comments ? String(comments) : null,
          occurred_at: new Date().toISOString(),
        });
      } catch { /* trail is best-effort */ }

      return json({ ok: true, accepted: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("document-countersign error:", error);
    return json({ error: error instanceof Error ? error.message : "Failed" }, 500);
  }
});
