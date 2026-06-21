// Token-gated lien-waiver flow for the (unauthenticated) claimant:
//  GET  ?token=...                       → fetch the waiver to render
//  POST { token, action:"sign", ... }    → save typed signature + their field fills, status=submitted
//  POST { token, action:"notarize", ... } → store the uploaded notarized scan
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const BUCKET = "daily-report-files";

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const bytesFromDataUrl = (d: string) => Uint8Array.from(atob((d.split(",")[1] ?? d)), (c) => c.charCodeAt(0));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = admin();

  try {
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token");
      if (!token) return json({ error: "token required" }, 400);
      const { data: w } = await db.from("lien_releases")
        .select("id, status, spec, title, claimant_name, claimant_signature_path, claimant_signed_name, claimant_signed_at, notarized_path, locked, projects(name)")
        .eq("sign_token", token).maybeSingle();
      if (!w) return json({ error: "Waiver not found" }, 404);
      return json({
        title: w.title, claimant: w.claimant_name, project: (w as any).projects?.name ?? "",
        spec: w.spec, status: w.status, locked: w.locked,
        signature_url: w.claimant_signature_path, signed_name: w.claimant_signed_name,
        signed_at: w.claimant_signed_at, notarized_url: w.notarized_path,
      });
    }

    const body = await req.json();
    const { token, action } = body;
    if (!token) return json({ error: "token required" }, 400);
    const { data: w } = await db.from("lien_releases").select("*").eq("sign_token", token).maybeSingle();
    if (!w) return json({ error: "Waiver not found" }, 404);
    const base = `${w.tenant_id}/${w.project_id}/lien-releases`;

    if (action === "get") {
      return json({
        title: w.title, claimant: w.claimant_name, spec: w.spec, status: w.status, locked: w.locked,
        signature_url: w.claimant_signature_path, signed_name: w.claimant_signed_name,
        signed_at: w.claimant_signed_at, notarized_url: w.notarized_path,
      });
    }
    if (w.locked) return json({ error: "This waiver is already executed and locked." }, 409);

    if (action === "sign") {
      const { name, title, dateStr, signatureDataUrl } = body;
      if (!name || !signatureDataUrl) return json({ error: "name and signature required" }, 400);
      const sigPath = `${base}/sig/${crypto.randomUUID()}.png`;
      const up = await db.storage.from(BUCKET).upload(sigPath, bytesFromDataUrl(signatureDataUrl), { contentType: "image/png", upsert: false });
      if (up.error) return json({ error: up.error.message }, 500);
      const sigUrl = db.storage.from(BUCKET).getPublicUrl(sigPath).data.publicUrl;
      // fold the claimant's fills into the frozen spec
      const spec = { ...(w.spec ?? {}) };
      spec.signature = { ...(spec.signature ?? {}), name, title: title || spec.signature?.title || "", date: dateStr || "" };
      const { error } = await db.from("lien_releases").update({
        spec, claimant_signature_path: sigUrl, claimant_signed_name: name,
        claimant_signed_at: new Date().toISOString(), status: "submitted",
      }).eq("id", w.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, signature_url: sigUrl });
    }

    if (action === "notarize") {
      const { fileBase64, filename } = body;
      if (!fileBase64) return json({ error: "file required" }, 400);
      const isPdf = (filename ?? "").toLowerCase().endsWith(".pdf");
      const path = `${base}/notarized/${crypto.randomUUID()}.${isPdf ? "pdf" : "png"}`;
      const up = await db.storage.from(BUCKET).upload(path, bytesFromDataUrl(fileBase64), {
        contentType: isPdf ? "application/pdf" : "image/png", upsert: false,
      });
      if (up.error) return json({ error: up.error.message }, 500);
      const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const { error } = await db.from("lien_releases").update({
        notarized_path: url, notarized_uploaded_at: new Date().toISOString(),
      }).eq("id", w.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, notarized_url: url });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
