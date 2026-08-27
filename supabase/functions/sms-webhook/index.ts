// Twilio delivery receipts and inbound messages. Requests are authenticated by
// X-Twilio-Signature, not a Supabase JWT.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizePhone } from "../_shared/phone.ts";

const xml = () => new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
  status: 200,
  headers: { "Content-Type": "text/xml" },
});

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function validSignature(url: string, params: URLSearchParams, token: string, received: string): Promise<boolean> {
  const ordered = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const payload = url + ordered.map(([key, value]) => `${key}${value}`).join("");
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return constantTimeEqual(expected, received);
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const accountSid = params.get("AccountSid") ?? "";
    const signature = req.headers.get("X-Twilio-Signature") ?? "";
    if (!accountSid || !signature) return new Response("Unauthorized", { status: 401 });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: connection } = await admin.from("sms_connections")
      .select("tenant_id,auth_token")
      .eq("account_sid", accountSid)
      .maybeSingle();
    if (!connection) return new Response("Unauthorized", { status: 401 });

    const signatureUrl = Deno.env.get("TWILIO_WEBHOOK_URL") || req.url;
    if (!await validSignature(signatureUrl, params, connection.auth_token, signature)) {
      return new Response("Invalid signature", { status: 403 });
    }

    const requestUrl = new URL(req.url);
    const mode = requestUrl.searchParams.get("mode");
    const messageSid = params.get("MessageSid") ?? params.get("SmsSid") ?? "";
    if (!messageSid) return xml();

    if (mode === "status") {
      const rawStatus = params.get("MessageStatus") ?? "queued";
      const status = ["queued", "sent", "delivered", "undelivered", "failed"].includes(rawStatus)
        ? rawStatus
        : "queued";
      await admin.from("project_sms_messages").update({
        status,
        error_message: params.get("ErrorMessage") || (params.get("ErrorCode") ? `Twilio error ${params.get("ErrorCode")}` : null),
      }).eq("provider_message_id", messageSid).eq("tenant_id", connection.tenant_id);
      return xml();
    }

    const from = normalizePhone(params.get("From"));
    const to = normalizePhone(params.get("To"));
    const body = String(params.get("Body") ?? "").trim().slice(0, 1600);
    if (!from || !to || !body) return xml();

    // Route a reply to the most recent project/contact conversation with this
    // phone number. This keeps inbound replies inside the originating project.
    const { data: prior } = await admin.from("project_sms_messages")
      .select("tenant_id,project_id,contact_id,recipient_user_id")
      .eq("tenant_id", connection.tenant_id)
      .eq("direction", "outbound")
      .eq("to_phone", from)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prior) return xml();

    const { data: existing } = await admin.from("project_sms_messages")
      .select("id")
      .eq("provider", "twilio")
      .eq("provider_message_id", messageSid)
      .maybeSingle();
    if (!existing) {
      await admin.from("project_sms_messages").insert({
        tenant_id: prior.tenant_id,
        project_id: prior.project_id,
        contact_id: prior.contact_id,
        recipient_user_id: prior.recipient_user_id,
        direction: "inbound",
        status: "received",
        from_phone: from,
        to_phone: to,
        body,
        provider: "twilio",
        provider_message_id: messageSid,
        metadata: { num_media: Number(params.get("NumMedia") ?? 0) },
      });
    }
    return xml();
  } catch (error) {
    console.error("sms webhook error:", error);
    return new Response("Webhook error", { status: 500 });
  }
});
