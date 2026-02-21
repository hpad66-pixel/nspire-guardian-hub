import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendEmailRequest {
  recipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from token
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth validation failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log("Authenticated user:", userId);

    const body: SendEmailRequest = await req.json();
    const {
      recipients,
      ccRecipients,
      bccRecipients,
      subject,
      bodyHtml,
      bodyText,
    } = body;

    // Get user's profile for auto-BCC if not provided
    let finalBccRecipients = bccRecipients || [];
    
    // Fetch user's profile to get their email for auto-BCC
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, work_email, auto_bcc_enabled, full_name")
      .eq("user_id", userId)
      .single();

    const senderName = profile?.full_name || "User";

    // Add user's email to BCC if auto_bcc is enabled
    if (profile?.auto_bcc_enabled !== false) {
      const userEmail = profile?.work_email || profile?.email;
      if (userEmail && !finalBccRecipients.includes(userEmail) && !recipients.includes(userEmail)) {
        finalBccRecipients = [...finalBccRecipients, userEmail];
        console.log("Auto-BCC added:", userEmail);
      }
    }

    // Validate required fields
    if (!recipients?.length || !subject || !bodyHtml) {
      console.error("Missing required fields:", { recipients: !!recipients, subject: !!subject, bodyHtml: !!bodyHtml });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((email: string) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      console.error("Invalid email addresses:", invalidEmails);
      return new Response(
        JSON.stringify({ error: `Invalid email addresses: ${invalidEmails.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending email to ${recipients.length} recipient(s):`, recipients);

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      from: `${senderName} <admin@apas.ai>`,
      to: recipients,
      subject: subject,
      html: bodyHtml,
    };

    // Add CC if any
    if (ccRecipients && ccRecipients.length > 0) {
      emailPayload.cc = ccRecipients;
    }

    // Add BCC recipients if any
    if (finalBccRecipients.length > 0) {
      emailPayload.bcc = finalBccRecipients;
      console.log("Sending with BCC to:", finalBccRecipients);
    }

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();
    console.log("Resend API response:", emailResult);

    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailResult);
      return new Response(
        JSON.stringify({ error: emailResult.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the email to database using service role for insert
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── AUTO-CONTACT EXTRACTION ─────────────────────────────────────────────
    // For every external recipient (To + CC), auto-create a CRM contact if one
    // doesn't already exist for that email address in this workspace.
    const autoContactEmails = [
      ...(recipients || []),
      ...(ccRecipients || []),
    ].filter(Boolean);

    if (autoContactEmails.length > 0) {
      // Fetch sender's workspace_id
      const { data: senderProfile } = await supabaseAdmin
        .from("profiles")
        .select("workspace_id")
        .eq("user_id", userId)
        .single();

      const workspaceId = senderProfile?.workspace_id;

      for (const email of autoContactEmails) {
        // Skip if same as sender's own email
        const senderEmail = profile?.work_email || profile?.email;
        if (senderEmail && email.toLowerCase() === senderEmail.toLowerCase()) continue;

        // Check if contact already exists in this workspace
        const { data: existing } = await supabaseAdmin
          .from("crm_contacts")
          .select("id")
          .ilike("email", email)
          .eq("workspace_id", workspaceId ?? "00000000-0000-0000-0000-000000000001")
          .maybeSingle();

        if (!existing) {
          // Parse a best-guess first name from the email local part
          const localPart = email.split("@")[0] ?? "";
          const nameParts = localPart.replace(/[._\-+]/g, " ").split(" ").filter(Boolean);
          const firstName = nameParts[0]
            ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase()
            : "Unknown";
          const lastName = nameParts[1]
            ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1).toLowerCase()
            : null;

          const { error: contactErr } = await supabaseAdmin
            .from("crm_contacts")
            .insert({
              first_name: firstName,
              last_name: lastName,
              email,
              contact_type: "other",
              notes: `Auto-captured from outbound email on ${new Date().toISOString().split("T")[0]}. Subject: "${subject}"`,
              workspace_id: workspaceId ?? "00000000-0000-0000-0000-000000000001",
              created_by: userId,
              is_active: true,
            });

          if (contactErr) {
            console.warn("Auto-contact insert failed for", email, contactErr.message);
          } else {
            console.log("Auto-contact created:", email);
          }
        }
      }
    }
    // ── END AUTO-CONTACT EXTRACTION ─────────────────────────────────────────

    const emailRecord = {
      recipients,
      bcc_recipients: finalBccRecipients,
      subject,
      report_type: "general",
      sent_by: userId,
      status: "sent",
      body_html: bodyHtml,
      body_text: bodyText || "",
      is_read: true,
      source_module: "mailbox",
    };

    const { error: insertError } = await supabaseAdmin
      .from("report_emails")
      .insert(emailRecord);

    if (insertError) {
      console.error("Failed to log email to database:", insertError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in send-email function:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
