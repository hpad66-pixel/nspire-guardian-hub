// Parse a client/vendor document (invoice, AIA pay app, or lien waiver) PDF into
// structured fields using Claude document vision. The caller passes the PDF as
// base64; this returns the extracted fields for review (no DB writes — the UI
// decides what to attach/create). Authenticated (GC), so the API key stays server-side.
//
// Input:  { pdfBase64: string, mediaType?: string, projectId: string }
// Output: { ok, fields: {...} }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MEDIA = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function hasExpectedSignature(base64: string, media: string): boolean {
  try {
    const bytes = Uint8Array.from(atob(base64.slice(0, 32)), (character) => character.charCodeAt(0));
    const text = (start: number, end: number) => new TextDecoder().decode(bytes.slice(start, end));
    if (media === "application/pdf") return text(0, 5) === "%PDF-";
    if (media === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (media === "image/png") {
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
        .every((value, index) => bytes[index] === value);
    }
    return media === "image/webp" && text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  } catch {
    return false;
  }
}

const TOOL = {
  name: "document_fields",
  description: "Return the structured fields extracted from this construction-payment document.",
  input_schema: {
    type: "object",
    properties: {
      doc_type: { type: "string", enum: ["invoice", "pay_app", "lien_waiver", "change_order", "other"], description: "Best classification of the document." },
      vendor_name: { type: "string", description: "The company billing / claiming / submitting (the payee). Empty if unclear." },
      vendor_email: { type: "string", description: "Vendor email exactly as printed. Empty if absent." },
      vendor_phone: { type: "string", description: "Vendor phone exactly as printed. Empty if absent." },
      vendor_website: { type: "string", description: "Vendor website exactly as printed. Empty if absent." },
      vendor_address_line1: { type: "string", description: "Vendor street address exactly as printed. Empty if absent." },
      vendor_address_line2: { type: "string", description: "Vendor secondary address line exactly as printed. Empty if absent." },
      vendor_city: { type: "string", description: "Vendor city exactly as printed. Empty if absent." },
      vendor_state: { type: "string", description: "Vendor state/region exactly as printed. Empty if absent." },
      vendor_postal_code: { type: "string", description: "Vendor postal code exactly as printed. Empty if absent." },
      bill_to: { type: "string", description: "Who the document is addressed to (the payer), if shown." },
      project_name: { type: "string", description: "Project or job name/number if shown." },
      invoice_number: { type: "string", description: "Invoice #, application #, or waiver # if shown." },
      invoice_date: { type: "string", description: "Document date as ISO yyyy-mm-dd if determinable, else as printed." },
      due_date: { type: "string", description: "Invoice due date as ISO yyyy-mm-dd if shown. Empty if absent." },
      period_end: { type: "string", description: "Billing period end / through date as ISO yyyy-mm-dd if shown." },
      amount: { type: "number", description: "The primary amount due / payment amount (this invoice's current amount payable)." },
      total_completed: { type: "number", description: "AIA: total completed & stored to date, if present." },
      retainage_amount: { type: "number", description: "Retainage withheld amount, if present." },
      retainage_pct: { type: "number", description: "Retainage percent (0-100), if present." },
      tax: { type: "number", description: "Tax amount, if present." },
      subtotal: { type: "number", description: "Invoice subtotal, if present." },
      payment_methods: { type: "array", items: { type: "string" }, description: "Payment methods explicitly printed on the document." },
      missing_fields: { type: "array", items: { type: "string" }, description: "Important vendor or invoice fields absent from the document." },
      waiver_type: { type: "string", enum: ["", "conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"], description: "For lien waivers: the form type. Empty otherwise." },
      signed_name: { type: "string", description: "For waivers: the printed signatory name, if shown." },
      line_items: {
        type: "array", description: "Itemized lines if the document has a clear line-item table; else empty.",
        items: { type: "object", properties: {
          description: { type: "string" }, amount: { type: "number" }, scheduled_value: { type: "number" }, this_period: { type: "number" },
        }, required: ["description"] },
      },
      summary: { type: "string", description: "One or two sentences summarizing the document in plain English." },
    },
    required: ["doc_type", "vendor_name", "amount", "summary"],
  },
};

const SYSTEM = `You read a single construction-payment document (a vendor invoice, an AIA G702/G703 pay application, or a mechanic's-lien waiver/release) and extract its key fields.
- Classify doc_type. AIA "Application and Certificate for Payment" → pay_app. A "Waiver and Release" of lien → lien_waiver.
- vendor_name is the party requesting/receiving payment or granting the waiver (the claimant/payee), NOT the recipient.
- For amount, return the single most important payable figure: an invoice's total due, or a pay app's CURRENT PAYMENT DUE.
- Parse dates to ISO yyyy-mm-dd when you can read them unambiguously.
- For lien waivers, set waiver_type from the form's heading (conditional vs unconditional, progress vs final).
- Only fill line_items when there's a genuine itemized table. Leave fields empty/0 when not present — never invent values.
- Preserve vendor contact information exactly as printed. Do not infer an email, address, tax ID, payment account, or due date.
- missing_fields should call out absent remittance fields that an administrator should confirm before payment.
- Always call the document_fields tool.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !anonKey) return json({ error: "Service not configured" }, 503);
    const userDb = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: authData } = await userDb.auth.getUser();
    if (!authData.user) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { pdfBase64, mediaType, projectId } = await req.json().catch(() => ({}));
    if (!pdfBase64 || typeof pdfBase64 !== "string") return json({ error: "pdfBase64 required" }, 400);
    const media = typeof mediaType === "string" && mediaType ? mediaType : "application/pdf";
    if (!ALLOWED_MEDIA.has(media)) return json({ error: "Only PDF, JPG, PNG, or WebP documents are accepted" }, 415);
    if (!projectId || typeof projectId !== "string") return json({ error: "projectId required" }, 400);
    if (Math.floor(pdfBase64.length * 0.75) > MAX_FILE_BYTES) return json({ error: "The document must be 12 MB or smaller" }, 413);
    if (!hasExpectedSignature(pdfBase64, media)) return json({ error: "The document content does not match its file type" }, 415);
    const { data: project, error: projectError } = await userDb.from("projects")
      .select("id").eq("id", projectId).is("deleted_at", null).maybeSingle();
    if (projectError || !project) return json({ error: "Project not found or not authorized" }, 404);
    const isImage = media.startsWith("image/");

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: "user", content: [
          isImage
            ? { type: "image", source: { type: "base64", media_type: media, data: pdfBase64 } }
            : { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: "Extract this document's fields." },
        ] }],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "document_fields" },
      }),
    });
    if (!res.ok) {
      await res.text();
      return json({ error: "The document-reading service could not process this file" }, 502);
    }
    const data = await res.json() as { content?: Array<{ type?: string; input?: unknown }> };
    await logAiUsage({ req, skill: "extract_document", model: MODEL, anthropicJson: data, projectId });
    const toolUse = (data.content ?? []).find((content) => content.type === "tool_use");
    const fields = toolUse?.input;
    if (!fields) return json({ error: "No fields extracted" }, 502);
    return json({ ok: true, fields });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
