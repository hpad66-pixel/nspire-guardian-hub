import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  ApasCrmError,
  MAX_JSON_BYTES,
  hmacHex,
  sha256Hex,
  validateApasEvent,
} from "../_shared/apas-crm-integration.ts";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const encoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

serve(async (req) => {
  const receiptId = crypto.randomUUID();
  try {
    if (req.method !== "POST") return json({ accepted: false, error: "method_not_allowed" }, 405);
    const secret = Deno.env.get("APAS_CRM_WEBHOOK_SECRET") ?? "";
    const expectedIssuer = Deno.env.get("APAS_CRM_EVENT_ISSUER") ?? "apas-crm";
    const expectedAudience = Deno.env.get("APAS_CRM_EVENT_AUDIENCE") ?? "proj-os";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (secret.length < 32 || !supabaseUrl || !serviceKey) {
      console.error("[crm-integration-events]", receiptId, "receiver_not_configured");
      return json({ accepted: false, error: "receiver_not_configured", receiptId }, 503);
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_JSON_BYTES) return json({ accepted: false, error: "payload_too_large", receiptId }, 413);
    const rawBody = await req.text();
    if (encoder.encode(rawBody).byteLength > MAX_JSON_BYTES) return json({ accepted: false, error: "payload_too_large", receiptId }, 413);

    const timestampHeader = req.headers.get("x-apas-timestamp") ?? "";
    const signatureHeader = req.headers.get("x-apas-signature") ?? "";
    const timestamp = Number(timestampHeader);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) {
      return json({ accepted: false, error: "invalid_timestamp", receiptId }, 401);
    }
    const suppliedSignature = signatureHeader.startsWith("v1=") ? signatureHeader.slice(3) : "";
    const expectedSignature = await hmacHex(secret, `${timestampHeader}.${rawBody}`);
    if (!/^[0-9a-f]{64}$/i.test(suppliedSignature) || !constantTimeEqual(suppliedSignature.toLowerCase(), expectedSignature)) {
      return json({ accepted: false, error: "invalid_signature", receiptId }, 401);
    }

    let parsed: unknown;
    try { parsed = JSON.parse(rawBody); } catch { return json({ accepted: false, error: "invalid_json", receiptId }, 400); }
    const event = validateApasEvent(parsed);
    if (event.issuer !== expectedIssuer || event.audience !== expectedAudience) {
      return json({ accepted: false, error: "invalid_event_authority", receiptId }, 401);
    }
    if (Math.abs(Date.now() - Date.parse(event.occurredAt)) > 5 * 60_000) {
      return json({ accepted: false, error: "stale_event", receiptId }, 401);
    }

    const eventSummary = {
      remoteStatus: event.data.remoteStatus,
      canonicalContactId: event.data.canonicalContactId,
      retiredContactId: event.data.retiredContactId,
      survivingContactId: event.data.survivingContactId,
      displayName: event.data.displayName,
      companyName: event.data.companyName,
      primaryEmail: event.data.primaryEmail,
      contactUrl: event.data.contactUrl,
      reviewPayload: event.data.reviewPayload,
    };
    const payloadDigest = await sha256Hex(rawBody);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc("apply_crm_integration_event", {
      p_event_id: event.eventId,
      p_contract_version: event.contractVersion,
      p_event_type: event.type,
      p_external_intake_id: event.data.externalIntakeId,
      p_correlation_id: event.data.correlationId,
      p_payload_digest: payloadDigest,
      p_event_summary: eventSummary,
      p_occurred_at: event.occurredAt,
    });
    if (error) {
      console.error("[crm-integration-events]", receiptId, "event_apply_failed");
      return json({ accepted: false, error: "event_apply_failed", receiptId }, 500);
    }
    // invalid_target is acknowledged without revealing whether a tenant/project
    // identifier exists. It remains available to operators in the receiver log.
    return json({ accepted: true, replayed: data === "replayed", receiptId }, data === "replayed" ? 200 : 202);
  } catch (error) {
    const code = error instanceof ApasCrmError ? error.code : "invalid_event";
    const status = error instanceof ApasCrmError ? error.status : 400;
    console.error("[crm-integration-events]", receiptId, code);
    return json({ accepted: false, error: code, receiptId }, status);
  }
});
