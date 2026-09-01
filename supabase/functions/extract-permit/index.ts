// Extract structured fields from a permit photo / PDF using Claude vision.
// Authenticated callers send base64 image or PDF; no DB writes — the UI reviews
// and saves. On-device prep (resize/compress) happens in the client before invoke.
//
// Input:  { imageBase64: string, mediaType?: string, notationHint?: string }
// Output: { ok, fields: PermitFields, rawText?: string }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const TOOL = {
  name: "permit_fields",
  description: "Return the structured fields extracted from this building / construction permit document or card.",
  input_schema: {
    type: "object",
    properties: {
      permit_number: { type: "string", description: "Permit / application / license number as printed." },
      description: { type: "string", description: "Short work description or permit title." },
      department: { type: "string", description: "Issuing department or agency (e.g. Building & Licensing, Public Works)." },
      trade: { type: "string", description: "Trade if shown (Plumbing, Building, Electrical, Mechanical, etc.)." },
      contractor: { type: "string", description: "Contractor / applicant name if shown." },
      building: { type: "string", description: "Building label or unit if shown (e.g. Building 5)." },
      street_address: { type: "string", description: "Job site / property street address." },
      city: { type: "string", description: "City if shown." },
      issued_on: { type: "string", description: "Issue / approval date as ISO yyyy-mm-dd when unambiguous." },
      expires_on: { type: "string", description: "Expiry date as ISO yyyy-mm-dd when unambiguous." },
      status_guess: {
        type: "string",
        enum: ["open_active", "pending", "closed", "expired", "on_hold", "unknown"],
        description: "Best status guess from stamps/labels on the document.",
      },
      issuing_authority: { type: "string", description: "City / county / authority name." },
      raw_text_summary: { type: "string", description: "Concise OCR-style dump of the key printed lines (max ~800 chars)." },
      confidence: { type: "number", description: "0-1 confidence that this is a permit / official card." },
    },
    required: ["permit_number", "description", "raw_text_summary", "confidence"],
  },
};

const SYSTEM = `You read a photo or PDF of a construction / building permit, inspection card, or city permit slip.
Extract the fields accurately. Prefer the printed permit number exactly as shown (including dashes).
If a field is not visible, return an empty string — never invent numbers or addresses.
Dates: ISO yyyy-mm-dd only when unambiguous; otherwise empty.
status_guess: use stamps like APPROVED/CLOSED/EXPIRED when present; else unknown.
Always call the permit_fields tool.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const mediaType = typeof body.mediaType === "string" && body.mediaType
      ? body.mediaType
      : "image/jpeg";
    const notationHint = typeof body.notationHint === "string" ? body.notationHint.trim() : "";

    if (!imageBase64) return json({ error: "imageBase64 required" }, 400);

    const isImage = mediaType.startsWith("image/");
    const userText = notationHint
      ? `Extract this permit. Field note from the inspector: ${notationHint}`
      : "Extract this permit.";

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            isImage
              ? { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } }
              : { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageBase64 } },
            { type: "text", text: userText },
          ],
        }],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "permit_fields" },
      }),
    });

    if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
    const data = await res.json();
    await logAiUsage({
      req,
      skill: "extract_permit",
      model: MODEL,
      anthropicJson: data,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
    });

    const toolUse = (data?.content ?? []).find((c: { type?: string }) => c.type === "tool_use");
    const fields = toolUse?.input;
    if (!fields) return json({ error: "No fields extracted" }, 502);

    return json({
      ok: true,
      fields,
      rawText: typeof fields.raw_text_summary === "string" ? fields.raw_text_summary : "",
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
