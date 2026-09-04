import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractBusinessCard } from "./crm-card-ocr.ts";

Deno.test("synthetic card fixture is fictional and requires explicit local guards", async () => {
  const previous = {
    mode: Deno.env.get("CRM_CARD_OCR_MODE"), allow: Deno.env.get("CRM_CARD_ALLOW_SYNTHETIC"), environment: Deno.env.get("DEPLOYMENT_ENV"),
  };
  try {
    Deno.env.set("CRM_CARD_OCR_MODE", "synthetic");
    Deno.env.set("CRM_CARD_ALLOW_SYNTHETIC", "true");
    Deno.env.set("DEPLOYMENT_ENV", "test");
    const result = await extractBusinessCard([]);
    assertEquals(result.provider, "synthetic");
    assertEquals(result.fields.find((field) => field.field === "email")?.value.endsWith(".test"), true);
  } finally {
    for (const [key, value] of [["CRM_CARD_OCR_MODE", previous.mode], ["CRM_CARD_ALLOW_SYNTHETIC", previous.allow], ["DEPLOYMENT_ENV", previous.environment]] as const) {
      if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
    }
  }
});
