import type { ExtractedCardField } from "./crm-card-contract.ts";

export type CardImage = { bytes: Uint8Array; mediaType: string; side: "front" | "back" };
export type OcrExtraction = { fields: ExtractedCardField[]; provider: string; model: string };

const FIELD_NAMES = new Set(["name", "title", "organization", "email", "phone", "website", "address"]);

const EXTRACTION_TOOL = {
  name: "business_card_fields",
  description: "Extract only the visible contact details from this business card.",
  input_schema: {
    type: "object",
    properties: {
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", enum: [...FIELD_NAMES] },
            value: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            sourceSide: { type: "string", enum: ["front", "back"] },
          },
          required: ["field", "value", "confidence", "sourceSide"],
        },
      },
    },
    required: ["fields"],
  },
};

const SYSTEM = `Read the supplied business-card image or images. Extract only text that is visibly present.
Return name, title, organization, email, phone, website, and address when present. Use one item per field;
multiple phone values may be separate phone items. Confidence must reflect legibility, not plausibility.
Never infer or invent missing contact details. Always call business_card_fields.`;

export async function extractBusinessCard(images: CardImage[]): Promise<OcrExtraction> {
  const mode = Deno.env.get("CRM_CARD_OCR_MODE") ?? "anthropic";
  if (mode === "synthetic") {
    const environment = Deno.env.get("DEPLOYMENT_ENV") ?? "";
    if (Deno.env.get("CRM_CARD_ALLOW_SYNTHETIC") !== "true" || !["local", "development", "test"].includes(environment))
      throw new OcrError("service_unavailable", "Synthetic OCR is not authorized in this environment.", false);
    return syntheticExtraction();
  }
  if (mode !== "anthropic") throw new OcrError("service_unavailable", "The configured OCR provider is unsupported.", false);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const model = Deno.env.get("CRM_CARD_OCR_MODEL") ?? "";
  if (!apiKey || !model) throw new OcrError("service_unavailable", "Business-card OCR is not configured.", true);
  if (!images.length || images.length > 2) throw new OcrError("unsupported_image", "One or two card images are required.", false);

  const content = images.map((image) => ({
    type: "image",
    source: { type: "base64", media_type: image.mediaType, data: bytesToBase64(image.bytes) },
  }));
  content.push({ type: "text", text: "Extract the card. The images are ordered front, then optional back." } as never);
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model, max_tokens: 1800, system: SYSTEM,
        messages: [{ role: "user", content }],
        tools: [EXTRACTION_TOOL], tool_choice: { type: "tool", name: "business_card_fields" },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new OcrError("service_unavailable", "The card reader could not be reached.", true);
  }
  if (!response.ok) {
    console.error("[crm-card-ocr] provider status", response.status);
    throw new OcrError("service_unavailable", "The card reader is temporarily unavailable.", response.status >= 500 || response.status === 429);
  }
  const result = await response.json();
  const input = (result?.content ?? []).find((item: Record<string, unknown>) => item.type === "tool_use")?.input;
  if (!input || !Array.isArray(input.fields)) throw new OcrError("processing_error", "The card reader returned an invalid result.", true);

  const fields = input.fields.flatMap((raw: unknown): ExtractedCardField[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (!FIELD_NAMES.has(String(item.field)) || typeof item.value !== "string" || !item.value.trim()) return [];
    const confidence = Number(item.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return [];
    const sourceSide = item.sourceSide === "back" && images.length > 1 ? "back" : "front";
    return [{
      field: item.field as ExtractedCardField["field"], value: item.value.trim().slice(0, 2_000),
      confidence, sourceSide, reviewRequired: confidence < 0.86,
    }];
  });
  if (!fields.length) throw new OcrError("unreadable", "No contact details could be read from this card.", false);
  return { fields, provider: "anthropic", model };
}

export class OcrError extends Error {
  constructor(
    readonly code: "unsupported_image" | "unreadable" | "service_unavailable" | "processing_error",
    message: string,
    readonly retryable: boolean,
  ) { super(message); this.name = "OcrError"; }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function syntheticExtraction(): OcrExtraction {
  return {
    provider: "synthetic", model: "fixture-v1",
    fields: [
      { field: "name", value: "Morgan Rivera", confidence: 0.98, sourceSide: "front", reviewRequired: false },
      { field: "title", value: "Project Executive", confidence: 0.95, sourceSide: "front", reviewRequired: false },
      { field: "organization", value: "Harbor Build Partners", confidence: 0.97, sourceSide: "front", reviewRequired: false },
      { field: "email", value: "morgan.rivera@example.test", confidence: 0.99, sourceSide: "front", reviewRequired: false },
      { field: "phone", value: "+1 (305) 555-0142", confidence: 0.92, sourceSide: "front", reviewRequired: false },
    ],
  };
}
