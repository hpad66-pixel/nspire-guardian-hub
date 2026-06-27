import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    if (!token || typeof token !== "string") return json({ error: "Missing token" }, 400);

    const db = admin();
    const { data: link } = await db
      .from("gallery_upload_links")
      .select("id, property_id, project_id, label, is_active, created_by")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!link) return json({ error: "This capture link is invalid or has been turned off." }, 404);

    // Resolve a friendly context name for the page header.
    let contextName = link.label || "Project";
    if (link.project_id) {
      const { data: p } = await db.from("projects").select("name").eq("id", link.project_id).maybeSingle();
      if (p?.name) contextName = p.name;
    } else if (link.property_id) {
      const { data: p } = await db.from("properties").select("name").eq("id", link.property_id).maybeSingle();
      if (p?.name) contextName = p.name;
    }

    // ── INFO request (no image): return context so the page can render. ──
    if (!body?.imageBase64) {
      return json({ ok: true, contextName, type: link.project_id ? "project" : "property" });
    }

    // ── UPLOAD request ──
    const caption: string = (body.caption ?? "").toString().slice(0, 500);
    const takenAt: string = /^\d{4}-\d{2}-\d{2}$/.test(body.takenAt) ? body.takenAt : new Date().toISOString().slice(0, 10);

    // Strip a possible data-URI prefix, then decode base64 → bytes.
    const b64 = String(body.imageBase64).replace(/^data:[^;]+;base64,/, "");
    let bytes: Uint8Array;
    try {
      const bin = atob(b64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return json({ error: "Could not read the image." }, 400);
    }
    if (bytes.length === 0) return json({ error: "Empty image." }, 400);
    if (bytes.length > 12_000_000) return json({ error: "Image is too large. Please retake at a smaller size." }, 413);

    const ctxId = link.project_id || link.property_id;
    const path = `gallery/${ctxId}/capture_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error: upErr } = await db.storage.from("daily-report-photos").upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (upErr) return json({ error: "Upload failed. Please try again." }, 500);

    const { data: { publicUrl } } = db.storage.from("daily-report-photos").getPublicUrl(path);

    const { error: insErr } = await db.from("photo_gallery").insert({
      url: publicUrl,
      caption,
      taken_at: takenAt,
      source: "direct",
      property_id: link.property_id,
      project_id: link.project_id,
      uploaded_by: link.created_by,
    });
    if (insErr) return json({ error: "Saved the photo but could not add it to the gallery." }, 500);

    return json({ ok: true, url: publicUrl, contextName });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
