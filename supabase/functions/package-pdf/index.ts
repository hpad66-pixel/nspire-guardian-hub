// Merge a pay application PDF (passed as base64) with selected supporting
// documents (downloaded from storage) into ONE package PDF, in the given order.
// PDFs are appended page-by-page; images (png/jpg) become a full page each.
// Authenticated (GC) — the API key / service role stays server-side.
//
// Input:  { payAppBase64: string, payAppLabel?: string, items: [{ bucket, path, contentType?, label? }] }
// Output: { ok, base64, skipped: string[] }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64 = (bytes: Uint8Array): string => {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const { payAppBase64, items } = await req.json().catch(() => ({}));
    if (!payAppBase64) return json({ error: "payAppBase64 required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const out = await PDFDocument.create();
    const skipped: string[] = [];

    const appendPdf = async (bytes: Uint8Array, label: string) => {
      try {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } catch { skipped.push(label); }
    };
    const appendImage = async (bytes: Uint8Array, kind: "png" | "jpg", label: string) => {
      try {
        const img = kind === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([612, 792]); // US Letter
        const m = 24;
        const scale = Math.min((612 - m * 2) / img.width, (792 - m * 2) / img.height, 1);
        const w = img.width * scale, h = img.height * scale;
        page.drawImage(img, { x: (612 - w) / 2, y: (792 - h) / 2, width: w, height: h });
      } catch { skipped.push(label); }
    };

    // 1) the pay app itself, first
    await appendPdf(b64ToBytes(payAppBase64), "Pay application");

    // 2) each selected supporting doc, in order
    for (const it of (Array.isArray(items) ? items : [])) {
      const label = it?.label || it?.path || "attachment";
      try {
        const { data, error } = await admin.storage.from(it.bucket || "project-artifacts").download(it.path);
        if (error || !data) { skipped.push(label); continue; }
        const bytes = new Uint8Array(await data.arrayBuffer());
        const ct = (it.contentType || "").toLowerCase();
        const head = String.fromCharCode(...bytes.subarray(0, 5));
        if (ct.includes("pdf") || head.startsWith("%PDF")) await appendPdf(bytes, label);
        else if (ct.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50)) await appendImage(bytes, "png", label);
        else if (ct.includes("jpeg") || ct.includes("jpg") || (bytes[0] === 0xff && bytes[1] === 0xd8)) await appendImage(bytes, "jpg", label);
        else skipped.push(label);
      } catch { skipped.push(label); }
    }

    const merged = await out.save();
    return json({ ok: true, base64: bytesToB64(merged), skipped });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
