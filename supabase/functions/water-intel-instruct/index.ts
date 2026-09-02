import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const token = String(body.token || "");
    const subject = String(body.subject || "Water Intelligence instruction").trim();
    const text = String(body.body || "").trim();
    const recipients = Array.isArray(body.recipients)
      ? body.recipients.map((r: unknown) => String(r).trim().toLowerCase()).filter((r: string) => r.includes("@"))
      : [];
    const accountId = body.accountId || null;
    const authorName = String(body.authorName || "Water Intelligence");

    if (!token || !text || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Token, body, and recipients are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: resolved, error: resErr } = await service.rpc("water_intel_resolve_token", { p_token: token });
    if (resErr) throw resErr;
    const row = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!row?.property_id) {
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let status = "sent";
    if (RESEND_API_KEY) {
      const html = `<p>${text.replace(/\n/g, "<br/>")}</p><p style="color:#878581;font-size:12px">Sent from Water Intelligence · ${row.property_name} · ${authorName}</p>`;
      const send = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "projOS Water Intelligence <notifications@projos.ai>",
          to: recipients,
          subject,
          html,
          text,
        }),
      });
      if (!send.ok) status = "failed";
    }

    const { data: instruction, error: logErr } = await service.rpc("water_intel_public_log_instruction", {
      p_token: token,
      p_subject: subject,
      p_body: text,
      p_recipients: recipients,
      p_account_id: accountId,
      p_status: status,
    });
    if (logErr) throw logErr;
    if (status === "failed") {
      return new Response(JSON.stringify({ error: "Email provider rejected the send", instruction }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, instruction }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
