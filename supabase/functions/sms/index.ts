// Authenticated project SMS through a workspace Twilio connection.
// Credentials remain in sms_connections and are never returned to the client.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizePhone } from "../_shared/phone.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const basicAuth = (sid: string, token: string) => `Basic ${btoa(`${sid}:${token}`)}`;

async function twilioRequest(
  sid: string,
  token: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`https://api.twilio.com/2010-04-01${path}`, {
    ...init,
    headers: {
      Authorization: basicAuth(sid, token),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.message ?? `Twilio request failed (${response.status})`));
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await userClient.auth.getUser();
    const user = authData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles")
      .select("workspace_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const tenantId = profile?.workspace_id as string | undefined;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const canConfigure = (roleRows ?? []).some((row: any) => ["admin", "owner", "administrator"].includes(row.role));
    const loadConnection = async () =>
      (await admin.from("sms_connections").select("*").eq("tenant_id", tenantId).maybeSingle()).data;

    if (action === "status") {
      const connection = await loadConnection();
      return json({
        connected: Boolean(connection),
        fromNumber: connection?.from_number ?? null,
        messagingServiceSid: connection?.messaging_service_sid ?? null,
        inboundConfigured: Boolean(connection?.inbound_configured),
        inboundError: connection?.inbound_error ?? null,
        inboundWebhookUrl: `${supabaseUrl}/functions/v1/sms-webhook`,
      });
    }

    if (action === "connect") {
      if (!canConfigure) return json({ error: "Only an administrator or owner can connect texting." }, 403);
      const accountSid = String(body.accountSid ?? "").trim();
      const authToken = String(body.authToken ?? "").trim();
      const fromNumber = normalizePhone(body.fromNumber);
      const messagingServiceSid = String(body.messagingServiceSid ?? "").trim() || null;
      if (!accountSid.startsWith("AC") || !authToken) return json({ error: "Enter a valid Twilio Account SID and auth token." }, 400);
      if (!fromNumber && !messagingServiceSid) return json({ error: "Enter a Twilio phone number or Messaging Service SID." }, 400);
      if (messagingServiceSid && !messagingServiceSid.startsWith("MG")) return json({ error: "Messaging Service SID must start with MG." }, 400);

      await twilioRequest(accountSid, authToken, `/Accounts/${encodeURIComponent(accountSid)}.json`);
      let inboundConfigured = false;
      let inboundError: string | null = null;
      if (fromNumber) {
        try {
          const result = await twilioRequest(
            accountSid,
            authToken,
            `/Accounts/${encodeURIComponent(accountSid)}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(fromNumber)}`,
          );
          const phoneResource = Array.isArray(result?.incoming_phone_numbers)
            ? result.incoming_phone_numbers.find((item: any) => normalizePhone(item?.phone_number) === fromNumber)
            : null;
          if (!phoneResource?.sid) throw new Error("The sender number was not found in this Twilio account.");
          const webhookForm = new URLSearchParams({
            SmsUrl: `${supabaseUrl}/functions/v1/sms-webhook`,
            SmsMethod: "POST",
          });
          await twilioRequest(
            accountSid,
            authToken,
            `/Accounts/${encodeURIComponent(accountSid)}/IncomingPhoneNumbers/${encodeURIComponent(phoneResource.sid)}.json`,
            { method: "POST", body: webhookForm },
          );
          inboundConfigured = true;
        } catch (error) {
          inboundError = error instanceof Error ? error.message : "Incoming reply setup failed.";
        }
      } else {
        inboundError = "Messaging Service connected. Add the displayed inbound webhook in Twilio to capture replies.";
      }
      const { error } = await admin.from("sms_connections").upsert({
        tenant_id: tenantId,
        account_sid: accountSid,
        auth_token: authToken,
        from_number: fromNumber,
        messaging_service_sid: messagingServiceSid,
        inbound_configured: inboundConfigured,
        inbound_error: inboundError,
        connected_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id" });
      if (error) return json({ error: error.message }, 500);
      return json({ connected: true, fromNumber, messagingServiceSid, inboundConfigured, inboundError });
    }

    if (action === "disconnect") {
      if (!canConfigure) return json({ error: "Only an administrator or owner can disconnect texting." }, 403);
      await admin.from("sms_connections").delete().eq("tenant_id", tenantId);
      return json({ connected: false });
    }

    if (action === "send") {
      const projectId = String(body.projectId ?? "");
      const contactId = body.contactId ? String(body.contactId) : null;
      const recipientUserId = body.recipientUserId ? String(body.recipientUserId) : null;
      const messageBody = String(body.message ?? "").trim();
      if (!projectId) return json({ error: "A project is required." }, 400);
      if ((!contactId && !recipientUserId) || (contactId && recipientUserId)) {
        return json({ error: "Choose one attached project person." }, 400);
      }
      if (!messageBody || messageBody.length > 1600) return json({ error: "Text must be between 1 and 1,600 characters." }, 400);

      // Project RLS is the principal authorization boundary.
      const { data: project, error: projectError } = await userClient.from("projects")
        .select("id,name")
        .eq("id", projectId)
        .maybeSingle();
      if (projectError || !project) return json({ error: "Project not found or not accessible." }, 404);

      let rawPhone: string | null = null;
      let personName = "Project contact";
      if (contactId) {
        const { data: attached } = await userClient.from("project_directory_entries")
          .select("id")
          .eq("project_id", projectId)
          .eq("contact_id", contactId)
          .maybeSingle();
        if (!attached) return json({ error: "Attach this CRM contact to the project before texting." }, 403);
        const { data: contact } = await admin.from("crm_contacts")
          .select("first_name,last_name,mobile,phone")
          .eq("id", contactId)
          .eq("workspace_id", tenantId)
          .maybeSingle();
        if (!contact) return json({ error: "CRM contact not found." }, 404);
        rawPhone = contact.mobile || contact.phone;
        personName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || personName;
      } else {
        const { data: attached } = await userClient.from("project_team_members")
          .select("id")
          .eq("project_id", projectId)
          .eq("user_id", recipientUserId!)
          .maybeSingle();
        if (!attached) return json({ error: "Add this user to the project team before texting." }, 403);
        const { data: recipient } = await admin.from("profiles")
          .select("full_name,phone,workspace_id")
          .eq("user_id", recipientUserId!)
          .eq("workspace_id", tenantId)
          .maybeSingle();
        if (!recipient) return json({ error: "Team member not found." }, 404);
        rawPhone = recipient.phone;
        personName = recipient.full_name || "Team member";
      }

      const to = normalizePhone(rawPhone);
      if (!to) return json({ error: `${personName} does not have a valid mobile number in CRM.` }, 400);
      const connection = await loadConnection();
      if (!connection) return json({ error: "Connect Twilio in Settings → Integrations before sending project texts." }, 400);

      const form = new URLSearchParams({ To: to, Body: messageBody });
      if (connection.messaging_service_sid) form.set("MessagingServiceSid", connection.messaging_service_sid);
      else form.set("From", connection.from_number);
      form.set("StatusCallback", `${supabaseUrl}/functions/v1/sms-webhook?mode=status`);

      const sent = await twilioRequest(
        connection.account_sid,
        connection.auth_token,
        `/Accounts/${encodeURIComponent(connection.account_sid)}/Messages.json`,
        { method: "POST", body: form },
      );
      const { data: saved, error: saveError } = await admin.from("project_sms_messages").insert({
        tenant_id: tenantId,
        project_id: projectId,
        contact_id: contactId,
        recipient_user_id: recipientUserId,
        direction: "outbound",
        status: ["queued", "sent", "delivered"].includes(sent.status) ? sent.status : "queued",
        from_phone: sent.from || connection.from_number || connection.messaging_service_sid,
        to_phone: sent.to || to,
        body: messageBody,
        provider: "twilio",
        provider_message_id: sent.sid,
        sent_by: user.id,
      }).select("*").single();
      if (saveError) return json({ error: `Text sent, but its project history could not be saved: ${saveError.message}` }, 500);
      return json({ ok: true, message: saved });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("sms error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown texting error" }, 500);
  }
});
