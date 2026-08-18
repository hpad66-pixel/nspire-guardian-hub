import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const token = req.method === "GET" ? new URL(req.url).searchParams.get("token") ?? "" : (await req.clone().json()).token ?? "";
    if (!UUID.test(token)) return json({ error: "Invalid token" }, 400);

    if (req.method === "GET") {
      const { data: proposal, error } = await admin.from("proposals").select("*, project:projects(name)").eq("sign_token", token).maybeSingle();
      if (error || !proposal) return json({ error: "Not found" }, 404);
      const { data: lines } = await admin.from("proposal_lines").select("*").eq("proposal_id", proposal.id).order("line_no");
      const projectName = (proposal.project as { name?: string } | null)?.name ?? "";
      delete proposal.project;
      return json({ proposal, lines: lines ?? [], project_name: projectName, signable: Boolean(proposal.locked) && proposal.status === "sent" && !proposal.accepted_signed_at });
    }

    if (req.method === "POST") {
      const { action, signature, name, comments } = await req.json();
      const { data: proposal, error } = await admin.from("proposals").select("*").eq("sign_token", token).maybeSingle();
      if (error || !proposal) return json({ error: "Not found" }, 404);
      if (!proposal.locked || proposal.status !== "sent") return json({ error: "Not ready for signature" }, 409);
      if (proposal.accepted_signed_at) return json({ error: "Already signed" }, 409);

      if (action === "reject") {
        if (!comments || String(comments).trim().length < 2) return json({ error: "Please explain what needs to change." }, 400);
        const { error: updateError } = await admin.from("proposals").update({ status: "rejected", client_comments: String(comments).trim(), accepted_signed_name: name || null }).eq("id", proposal.id);
        if (updateError) return json({ error: updateError.message }, 500);
        return json({ ok: true, rejected: true });
      }

      if (!signature || typeof signature !== "string" || !signature.startsWith("data:image")) return json({ error: "Signature required" }, 400);
      if (!name || String(name).trim().length < 2) return json({ error: "Please enter your name." }, 400);
      const bytes = Uint8Array.from(atob(signature.split(",")[1]), char => char.charCodeAt(0));
      const path = `${proposal.tenant_id}/${proposal.project_id}/proposals/signature/${crypto.randomUUID()}.png`;
      const upload = await admin.storage.from("daily-report-files").upload(path, bytes, { contentType: "image/png" });
      if (upload.error) return json({ error: upload.error.message }, 500);
      const signaturePath = admin.storage.from("daily-report-files").getPublicUrl(path).data.publicUrl;
      const { error: updateError } = await admin.from("proposals").update({
        status: "approved", accepted_signature_path: signaturePath, accepted_signed_at: new Date().toISOString(),
        accepted_signed_name: String(name).trim(), client_comments: comments ? String(comments).trim() : null,
        acceptance_method: "electronic",
      }).eq("id", proposal.id);
      if (updateError) return json({ error: updateError.message }, 500);

      const resend = Deno.env.get("RESEND_API_KEY");
      if (resend && proposal.client_email) {
        try { await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "APAS Consulting <hardeep@apas.ai>", to: [proposal.client_email], subject: `Accepted — ${proposal.proposal_no} ${proposal.title}`, html: `<div style="font-family:Georgia,serif"><p><b>${proposal.proposal_no} — ${proposal.title}</b> was accepted and signed by ${String(name).trim()}.</p></div>` }) }); } catch { /* best effort */ }
      }
      return json({ ok: true });
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (error) { return json({ error: String((error as Error).message ?? error) }, 500); }
});
