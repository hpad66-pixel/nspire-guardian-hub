import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    const { event_type, conversation_id, data } = payload;

    switch (event_type) {
      case 'conversation.started': {
        console.log('Conversation started:', conversation_id);
        break;
      }

      case 'conversation.ended': {
        console.log('Conversation ended:', conversation_id);
        
        // Update the maintenance request with call data
        if (data?.request_id) {
          const { error } = await supabase
            .from('maintenance_requests')
            .update({
              call_ended_at: new Date().toISOString(),
              call_duration_seconds: data.duration_seconds,
              call_transcript: data.transcript,
              call_recording_url: data.recording_url,
            })
            .eq('call_id', conversation_id);

          if (error) {
            console.error('Error updating request:', error);
          }
        }
        break;
      }

      case 'ticket.created': {
        // Send notification for new tickets
        const { request_id, is_emergency, caller_name, issue_category, issue_description, ticket_number } = data || {};
        
        if (request_id) {
          // Get voice agent config for notification settings
          const { data: config } = await supabase
            .from('voice_agent_config')
            .select('supervisor_notification_emails, emergency_notification_phone')
            .is('property_id', null)
            .single();

          const formattedTicket = `MR-${String(ticket_number).padStart(4, '0')}`;

          // Send email notification if Resend is configured
          if (RESEND_API_KEY && config?.supervisor_notification_emails?.length) {
            const subject = is_emergency 
              ? `🚨 EMERGENCY: ${formattedTicket} - ${issue_category}`
              : `New Maintenance Request: ${formattedTicket}`;

            const emailBody = `
              <h2>${is_emergency ? '🚨 EMERGENCY ' : ''}Maintenance Request ${formattedTicket}</h2>
              <p><strong>Caller:</strong> ${caller_name}</p>
              <p><strong>Category:</strong> ${issue_category}</p>
              <p><strong>Description:</strong> ${issue_description}</p>
              <p><strong>Urgency:</strong> ${is_emergency ? 'EMERGENCY' : 'Normal'}</p>
              <p><a href="${SUPABASE_URL.replace('supabase.co', 'lovable.app')}/voice-agent">View in Dashboard</a></p>
            `;

            try {
              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Glorieta Gardens <notifications@resend.dev>',
                  to: config.supervisor_notification_emails,
                  subject,
                  html: emailBody,
                }),
              });

              if (!emailResponse.ok) {
                console.error('Failed to send email:', await emailResponse.text());
              } else {
                console.log('Notification email sent successfully');
              }
            } catch (emailError) {
              console.error('Error sending email:', emailError);
            }
          }

          // Log activity
          await supabase
            .from('maintenance_request_activity')
            .insert({
              request_id,
              action: 'notification_sent',
              details: { 
                type: is_emergency ? 'emergency' : 'standard',
                recipients: config?.supervisor_notification_emails || []
              }
            });
        }
        break;
      }

      default:
        console.log('Unknown event type:', event_type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error in voice-agent-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
