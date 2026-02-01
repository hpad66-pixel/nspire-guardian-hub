import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendReportEmailRequest {
  recipients: string[];
  subject: string;
  reportType: "daily_inspection" | "daily_report";
  reportId: string;
  propertyName: string;
  inspectorName: string;
  inspectionDate: string;
  message?: string;
  pdfBase64: string;
  pdfFilename: string;
  statusSummary?: {
    ok: number;
    attention: number;
    defect: number;
  };
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

    const body: SendReportEmailRequest = await req.json();
    const {
      recipients,
      subject,
      reportType,
      reportId,
      propertyName,
      inspectorName,
      inspectionDate,
      message,
      pdfBase64,
      pdfFilename,
      statusSummary,
    } = body;

    // Validate required fields
    if (!recipients?.length || !subject || !reportId || !pdfBase64) {
      console.error("Missing required fields:", { recipients: !!recipients, subject: !!subject, reportId: !!reportId, pdfBase64: !!pdfBase64 });
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

    console.log(`Sending report email to ${recipients.length} recipient(s):`, recipients);

    // Build HTML email content
    const statusHtml = statusSummary
      ? `
        <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: #334155; font-size: 14px; font-weight: 600; text-transform: uppercase;">Inspection Summary</h3>
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="text-align: center; padding: 12px 24px; background-color: #dcfce7; border-radius: 8px; width: 33%;">
                <div style="font-size: 28px; font-weight: 700; color: #16a34a;">${statusSummary.ok}</div>
                <div style="font-size: 12px; color: #166534; font-weight: 500;">OK</div>
              </td>
              <td style="width: 16px;"></td>
              <td style="text-align: center; padding: 12px 24px; background-color: #fef3c7; border-radius: 8px; width: 33%;">
                <div style="font-size: 28px; font-weight: 700; color: #d97706;">${statusSummary.attention}</div>
                <div style="font-size: 12px; color: #92400e; font-weight: 500;">Attention</div>
              </td>
              <td style="width: 16px;"></td>
              <td style="text-align: center; padding: 12px 24px; background-color: #fee2e2; border-radius: 8px; width: 33%;">
                <div style="font-size: 28px; font-weight: 700; color: #dc2626;">${statusSummary.defect}</div>
                <div style="font-size: 12px; color: #991b1b; font-weight: 500;">Defect</div>
              </td>
            </tr>
          </table>
        </div>
      `
      : "";

    const customMessage = message
      ? `<p style="margin: 16px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; color: #475569;">${message}</p>`
      : "";

    const reportTypeLabel = reportType === "daily_inspection" ? "Daily Grounds Inspection" : "Daily Report";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${reportTypeLabel}</h1>
        <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Report Attached</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <!-- Property Info -->
        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Property</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${propertyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${inspectionDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Inspector</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${inspectorName}</td>
            </tr>
          </table>
        </div>

        ${statusHtml}
        ${customMessage}

        <p style="margin: 24px 0 0 0; color: #475569; font-size: 14px; line-height: 1.6;">
          Please find the complete inspection report attached to this email as a PDF document.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          This report was generated by NSPIRE Property OS
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NSPIRE Reports <onboarding@resend.dev>",
        to: recipients,
        subject: subject,
        html: htmlContent,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBase64,
          },
        ],
      }),
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

    const emailRecord: Record<string, unknown> = {
      recipients,
      subject,
      report_type: reportType,
      sent_by: userId,
      status: "sent",
      body_html: htmlContent,
      body_text: message || "",
      attachment_filename: pdfFilename,
      attachment_size: pdfBase64.length,
      is_read: true, // Sender has "read" their own email
    };

    if (reportType === "daily_inspection") {
      emailRecord.daily_inspection_id = reportId;
    } else {
      emailRecord.report_id = reportId;
    }

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
    console.error("Error in send-report-email function:", error);

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
