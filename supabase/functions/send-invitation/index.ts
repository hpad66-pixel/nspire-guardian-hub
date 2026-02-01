import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvitationRequest {
  invitationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invitationId }: InvitationRequest = await req.json();

    if (!invitationId) {
      throw new Error("Missing invitationId");
    }

    // Fetch the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      throw new Error("Invitation not found");
    }

    // Get inviter's profile for the name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", invitation.invited_by)
      .single();

    const inviterName = inviterProfile?.full_name || "A team member";

    // Generate the accept URL - this will need to be the preview/production URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://nspire-guardian-hub.lovable.app";
    const acceptUrl = `${baseUrl}/accept-invite/${invitation.token}`;

    const roleLabels: Record<string, string> = {
      admin: "Administrator",
      manager: "Property Manager",
      inspector: "Inspector",
      user: "Team Member",
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; padding: 16px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <h1 style="margin: 16px 0 8px; font-size: 24px; font-weight: 600;">Glorieta Gardens Apartments</h1>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">You're invited!</h2>
            <p style="margin: 0 0 16px; color: #64748b;">
              ${inviterName} has invited you to join Glorieta Gardens Apartments as a <strong>${roleLabels[invitation.role] || invitation.role}</strong>.
            </p>
            <p style="margin: 0 0 24px; color: #64748b;">
              Click the button below to create your account and get started.
            </p>
            <a href="${acceptUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>

          <div style="text-align: center; color: #94a3b8; font-size: 14px;">
            <p>This invitation will expire in 7 days.</p>
            <p style="margin-top: 16px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send the invitation email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Glorieta Gardens <noreply@resend.dev>",
        to: [invitation.email],
        subject: `${inviterName} invited you to Glorieta Gardens Apartments`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Invitation email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
