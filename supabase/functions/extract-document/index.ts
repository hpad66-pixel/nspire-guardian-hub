// Parse a client/vendor document (invoice, AIA pay app, or lien waiver) PDF into
// structured fields using Claude document vision. The caller passes the PDF as
// base64; this returns the extracted fields for review (no DB writes — the UI
// decides what to attach/create). Authenticated (GC), so the API key stays server-side.
//
// Input:  { pdfBase64: string, mediaType?: string }
// Output: { ok, fields: {...} }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const TOOL = {
  name: "document_fields",
  description: "Return the structured fields extracted from this construction-payment document.",
  input_schema: {
    type: "object",
    properties: {
      doc_type: { type: "string", enum: ["invoice", "pay_app", "lien_waiver", "change_order", "other"], description: "Best classification of the document." },
      vendor_name: { type: "string", description: "The company billing / claiming / submitting (the payee). Empty if unclear." },
      bill_to: { type: "string", description: "Who the document is addressed to (the payer), if shown." },
      project_name: { type: "string", description: "Project or job name/number if shown." },
      invoice_number: { type: "string", description: "Invoice #, application #, or waiver # if shown." },
      invoice_date: { type: "string", description: "Document date as ISO yyyy-mm-dd if determinable, else as printed." },
      period_end: { type: "string", description: "Billing period end / through date as ISO yyyy-mm-dd if shown." },
      amount: { type: "number", description: "The primary amount due / payment amount (this invoice's current amount payable)." },
      total_completed: { type: "number", description: "AIA: total completed & stored to date, if present." },
      retainage_amount: { type: "number", description: "Retainage withheld amount, if present." },
      retainage_pct: { type: "number", description: "Retainage percent (0-100), if present." },
      tax: { type: "number", description: "Tax amount, if present." },
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
- Always call the document_fields tool.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { pdfBase64, mediaType } = await req.json().catch(() => ({}));
    if (!pdfBase64 || typeof pdfBase64 !== "string") return json({ error: "pdfBase64 required" }, 400);
    const media = typeof mediaType === "string" && mediaType ? mediaType : "application/pdf";
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
    if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
    const data = await res.json();
    const toolUse = (data?.content ?? []).find((c: any) => c.type === "tool_use");
    const fields = toolUse?.input;
    if (!fields) return json({ error: "No fields extracted" }, 502);
    return json({ ok: true, fields });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
