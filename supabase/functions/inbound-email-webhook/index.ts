import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-inbound-webhook-secret",
};

function normalizeReplyDomain(rawDomain: string | null): string | null {
  if (!rawDomain) return null;
  return rawDomain.trim().replace(/^@/, "").toLowerCase() || null;
}

function parseAddressList(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => extractEmail(part))
      .filter(Boolean) as string[];
  }

  if (Array.isArray(value)) {
    const results: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        const email = extractEmail(item);
        if (email) results.push(email);
      } else if (item && typeof item === "object") {
        const maybeEmail = (item as Record<string, unknown>).email;
        if (typeof maybeEmail === "string") {
          const email = extractEmail(maybeEmail);
          if (email) results.push(email);
        }
      }
    }
    return results;
  }

  return [];
}

function extractEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const angleMatch = raw.match(/<([^>]+)>/);
  const candidate = (angleMatch?.[1] || raw).trim().toLowerCase();

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
    return candidate;
  }

  return null;
}

function extractThreadId(toRecipients: string[], replyDomain: string | null): string | null {
  const domainConstraint = replyDomain ? `@${replyDomain}` : "";

  for (const recipient of toRecipients) {
    if (domainConstraint && !recipient.endsWith(domainConstraint)) {
      continue;
    }

    const match = recipient.match(/^thread\+([a-f0-9-]{32,36})@/i);
    if (!match) continue;

    const token = match[1];
    if (token.length === 36) {
      return token.toLowerCase();
    }

    if (token.length === 32) {
      return `${token.slice(0, 8)}-${token.slice(8, 12)}-${token.slice(12, 16)}-${token.slice(16, 20)}-${token.slice(20)}`.toLowerCase();
    }
  }

  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const expectedSecret = Deno.env.get("INBOUND_WEBHOOK_SECRET");
    if (expectedSecret) {
      const headerSecret = req.headers.get("x-inbound-webhook-secret");
      const authHeader = req.headers.get("authorization");
      const bearerSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (headerSecret !== expectedSecret && bearerSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized webhook" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const contentType = req.headers.get("content-type") || "";
    let payload: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      payload = (await req.json()) as Record<string, unknown>;
    } else {
      const rawBody = await req.text();
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        const params = new URLSearchParams(rawBody);
        payload = Object.fromEntries(params.entries());
      }
    }

    const fromRaw =
      firstString(
        payload.from,
        (payload.from as Record<string, unknown> | undefined)?.email,
        payload.sender,
        (payload.sender as Record<string, unknown> | undefined)?.email,
        payload["from_email"],
      ) || "unknown@external";
    const fromEmail = extractEmail(fromRaw) || "unknown@external";

    const toRecipients = Array.from(
      new Set([
        ...parseAddressList(payload.to),
        ...parseAddressList(payload.recipients),
        ...parseAddressList(payload.delivered_to),
      ])
    );

    const replyDomain = normalizeReplyDomain(
      Deno.env.get("INBOUND_REPLY_DOMAIN") ?? Deno.env.get("EMAIL_REPLY_DOMAIN")
    );
    const threadId = extractThreadId(toRecipients, replyDomain);

    if (!threadId) {
      return new Response(
        JSON.stringify({ error: "No thread alias found in recipients", recipients: toRecipients }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subject = firstString(payload.subject, payload["Subject"]) || "(no subject)";
    const bodyHtml = firstString(payload.html, payload["body_html"], payload["html_body"]);
    const bodyText =
      firstString(
        payload.text,
        payload["body_text"],
        payload["text_body"],
        payload["stripped_text"],
      ) || "";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: threadRows, error: threadRowsError } = await supabaseAdmin
      .from("report_emails")
      .select("id, thread_id, sent_by, from_user_id, recipient_user_ids, source_module, report_type, property_id, project_id, work_order_id")
      .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
      .order("sent_at", { ascending: true });

    if (threadRowsError || !threadRows || threadRows.length === 0) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const root = threadRows[0];

    const participantUserIds = Array.from(
      new Set(
        threadRows
          .flatMap((row) => [
            row.sent_by,
            row.from_user_id,
            ...(Array.isArray(row.recipient_user_ids) ? row.recipient_user_ids : []),
          ])
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    );

    const { data: latestInThread } = await supabaseAdmin
      .from("report_emails")
      .select("id")
      .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const insertPayload = {
      recipients: [fromEmail],
      subject,
      status: "sent",
      body_html: bodyHtml,
      body_text: bodyText,
      is_read: false,
      message_type: "external" as const,
      source_module: root.source_module || "mailbox",
      report_type: root.report_type || "general",
      sent_by: null,
      from_user_id: null,
      from_user_name: fromRaw,
      recipient_user_ids: participantUserIds,
      thread_id: root.thread_id || root.id,
      reply_to_id: latestInThread?.id || null,
      property_id: root.property_id || null,
      project_id: root.project_id || null,
      work_order_id: root.work_order_id || null,
    };

    const { data: insertedEmail, error: insertError } = await supabaseAdmin
      .from("report_emails")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert inbound email:", insertError);
      return new Response(JSON.stringify({ error: "Failed to store inbound email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const forwardEnabled =
      (Deno.env.get("INBOUND_FORWARD_TO_USER") || "false").toLowerCase() === "true";

    if (forwardEnabled && RESEND_API_KEY && participantUserIds.length > 0) {
      const { data: participantProfiles } = await supabaseAdmin
        .from("profiles")
        .select("email, work_email")
        .in("user_id", participantUserIds);

      const forwardRecipients = Array.from(
        new Set(
          (participantProfiles || [])
            .map((profile) => (profile.work_email || profile.email || "").trim().toLowerCase())
            .filter((value) => !!value)
        )
      );

      if (forwardRecipients.length > 0) {
        const forwardHtml = bodyHtml
          ? `<div>${bodyHtml}</div>`
          : `<pre style="white-space:pre-wrap;font-family:inherit;">${bodyText}</pre>`;

        const forwardPayload: Record<string, unknown> = {
          from: "Inbox Forwarder <admin@apas.ai>",
          to: forwardRecipients,
          subject: `Fwd: ${subject}`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;">
              <p><strong>Inbound reply captured for thread ${root.thread_id || root.id}</strong></p>
              <p><strong>From:</strong> ${fromRaw}</p>
              <p><strong>Original recipients:</strong> ${toRecipients.join(", ") || "n/a"}</p>
              <hr />
              ${forwardHtml}
            </div>
          `,
        };

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(forwardPayload),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        threadId: root.thread_id || root.id,
        emailId: insertedEmail.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in inbound-email-webhook:", error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
