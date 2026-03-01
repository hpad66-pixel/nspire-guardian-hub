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

    // Fetch workspace details for dynamic branding
    const workspaceId = invitation.workspace_id;
    let orgName = "APAS OS";
    let primaryColor = "#3b82f6";
    let logoUrl: string | null = null;
    let fromEmail = "admin@apas.ai";
    let siteUrl = "https://apasos.ai";

    if (workspaceId) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("name, client_company")
        .eq("id", workspaceId)
        .single();

      if (workspace) {
        orgName = workspace.client_company || workspace.name || orgName;
      }

      // Try to fetch company branding for this workspace
      const { data: branding } = await supabase
        .from("company_branding")
        .select("company_name, primary_color, logo_url, email, website")
        .eq("workspace_id", workspaceId)
        .limit(1)
        .single();

      if (branding) {
        orgName = branding.company_name || orgName;
        primaryColor = branding.primary_color || primaryColor;
        logoUrl = branding.logo_url || null;
        if (branding.website) siteUrl = branding.website;
      }
    }

    // Build accept URL using the site URL or fallback
    const acceptUrl = `${siteUrl}/accept-invite/${invitation.token}`;

    // Compute gradient colors
    const gradientEnd = primaryColor; // Use primary as-is for gradient

    const roleLabels: Record<string, string> = {
      admin: "Administrator",
      owner: "Owner",
      manager: "Manager",
      administrator: "Administrator",
      project_manager: "Project Manager",
      superintendent: "Superintendent",
      inspector: "Inspector",
      subcontractor: "Subcontractor",
      clerk: "Clerk",
      viewer: "Viewer",
      user: "Team Member",
    };

    const logoBlock = logoUrl
      ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 48px; max-width: 200px; margin-bottom: 12px;" />`
      : `<div style="display: inline-block; padding: 16px; background: linear-gradient(135deg, ${primaryColor}, ${gradientEnd}); border-radius: 16px;">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
             <polyline points="9 22 9 12 15 12 15 22"></polyline>
           </svg>
         </div>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            ${logoBlock}
            <h1 style="margin: 16px 0 8px; font-size: 24px; font-weight: 600;">${orgName}</h1>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">You're invited!</h2>
            <p style="margin: 0 0 16px; color: #64748b;">
              ${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${roleLabels[invitation.role] || invitation.role}</strong>.
            </p>
            <p style="margin: 0 0 24px; color: #64748b;">
              Click the button below to create your account and get started.
            </p>
            <a href="${acceptUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, ${primaryColor}, ${gradientEnd}); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
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
        from: `${orgName} <${fromEmail}>`,
        to: [invitation.email],
        subject: `${inviterName} invited you to ${orgName}`,
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
