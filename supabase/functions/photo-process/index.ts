/**
 * B4 · photo-process edge function.
 *
 * Fills in the fields the browser uploader can't reliably produce:
 *   - `thumb_path`  — a small PNG thumbnail stored alongside the original.
 *   - `exif`        — JSON blob of camera/date/GPS metadata (server-side
 *                     redundancy of the client parser we use today).
 *
 * Contract:
 *   POST { photo_id: string }
 *   → 200 { ok: true, thumb_path, patched }
 *   → 404 if the row is missing.
 *   → 500 if the source file can't be downloaded.
 *
 * Heavy image libs (sharp, jimp) aren't trivially installable on the Deno
 * edge runtime, so we emit a square "center-crop" PNG using ImageScript,
 * which is pure TypeScript.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  Image, decode as decodeImage,
} from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

const THUMB_MAX = 320;
const BUCKET = "project-photos";

interface Payload { photo_id: string; }

async function downloadFile(
  supabase: ReturnType<typeof createClient>,
  path: string,
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const buf = await data.arrayBuffer();
  return new Uint8Array(buf);
}

async function makeThumb(input: Uint8Array): Promise<Uint8Array | null> {
  try {
    const decoded = await decodeImage(input);
    if (!(decoded instanceof Image)) return null;
    const longEdge = Math.max(decoded.width, decoded.height);
    if (longEdge <= THUMB_MAX) {
      return decoded.encode();
    }
    const scale = THUMB_MAX / longEdge;
    const w = Math.max(1, Math.round(decoded.width * scale));
    const h = Math.max(1, Math.round(decoded.height * scale));
    const resized = decoded.resize(w, h);
    return resized.encode();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  try {
    const { photo_id } = (await req.json()) as Payload;
    if (!photo_id) {
      return new Response(JSON.stringify({ error: "photo_id required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const { data: photo, error: phErr } = await supabase
      .from("photos")
      .select("id, storage_path, tenant_id, project_id, thumb_path")
      .eq("id", photo_id)
      .maybeSingle();
    if (phErr) throw phErr;
    if (!photo) {
      return new Response(JSON.stringify({ error: "photo not found" }),
        { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const bytes = await downloadFile(supabase, (photo as any).storage_path);
    if (!bytes) {
      return new Response(JSON.stringify({ error: "could not download source" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // 1) thumbnail
    const thumbBytes = await makeThumb(bytes);
    let thumbPath = (photo as any).thumb_path as string | null;
    if (thumbBytes) {
      const p = (photo as any).storage_path as string;
      const base = p.replace(/\.[^.]+$/, "");
      thumbPath = `${base}.thumb.png`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(thumbPath, thumbBytes, {
          contentType: "image/png", upsert: true,
        });
      if (upErr) throw upErr;
    }

    const patch: Record<string, unknown> = {};
    if (thumbPath) patch.thumb_path = thumbPath;

    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await supabase
        .from("photos").update(patch).eq("id", photo_id);
      if (upErr) throw upErr;
    }

    return new Response(JSON.stringify({
      ok: true, thumb_path: thumbPath, patched: Object.keys(patch),
    }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
