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
    const eventType = event_type || payload?.type;

    const normalizeString = (value: unknown, fallback: string | null = null) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) return trimmed;
      }
      return fallback;
    };

    const parseBoolean = (value: unknown) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', 'yes', '1'].includes(normalized)) return true;
        if (['false', 'no', '0'].includes(normalized)) return false;
      }
      if (typeof value === 'number') return value === 1;
      return null;
    };

    const buildTranscriptText = (transcript: unknown) => {
      if (!Array.isArray(transcript)) return null;
      const lines = transcript
        .map((entry) => {
          const role = normalizeString((entry as Record<string, unknown>)?.role);
          const message = normalizeString((entry as Record<string, unknown>)?.message);
          if (!message) return null;
          const label = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Speaker';
          return `${label}: ${message}`;
        })
        .filter(Boolean);
      return lines.length ? lines.join('\n') : null;
    };

    switch (eventType) {
      case 'conversation.started': {
        console.log('Conversation started:', conversation_id);
        break;
      }

      case 'conversation.ended': {
        console.log('Conversation ended:', conversation_id);
        
        // Update the maintenance request with call data
        if (data?.request_id || conversation_id) {
          const { error } = await supabase
            .from('maintenance_requests')
            .update({
              call_ended_at: new Date().toISOString(),
              call_duration_seconds: data.duration_seconds,
              call_transcript: data.transcript,
              call_recording_url: data.recording_url,
            })
            .eq(data?.request_id ? 'id' : 'call_id', data?.request_id || conversation_id);

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

      case 'post_call_transcription': {
        const postCallData = data || payload?.data || {};
        const conversationId = normalizeString(
          postCallData?.conversation_id || conversation_id || payload?.conversation_id
        );

        const transcriptText = buildTranscriptText(postCallData?.transcript);
        const userOnlyTranscript = Array.isArray(postCallData?.transcript)
          ? postCallData.transcript
              .filter((entry: Record<string, unknown>) => normalizeString(entry?.role) === 'user')
              .map((entry: Record<string, unknown>) => normalizeString(entry?.message))
              .filter(Boolean)
              .join('\n')
          : null;

        const dynamicVars =
          postCallData?.conversation_initiation_client_data?.dynamic_variables ||
          postCallData?.conversation_initiation_client_data?.dynamicVariables ||
          {};

        const callerName =
          normalizeString(dynamicVars?.caller_name) ||
          normalizeString(dynamicVars?.callerName) ||
          normalizeString(dynamicVars?.user_name) ||
          'Unknown';

        const callerPhone =
          normalizeString(dynamicVars?.caller_phone) ||
          normalizeString(dynamicVars?.callerPhone) ||
          normalizeString(dynamicVars?.phone) ||
          'Unknown';

        const callerEmail =
          normalizeString(dynamicVars?.caller_email) ||
          normalizeString(dynamicVars?.callerEmail) ||
          normalizeString(dynamicVars?.email);

        const propertyId = normalizeString(dynamicVars?.property_id) || null;
        const unitId = normalizeString(dynamicVars?.unit_id) || null;
        const unitNumber = normalizeString(dynamicVars?.unit_number) || null;

        const dataCollection = postCallData?.analysis?.data_collection_results || {};

        const issueCategory =
          normalizeString(dynamicVars?.issue_category) ||
          normalizeString(dataCollection?.issue_category?.value) ||
          normalizeString(dataCollection?.category?.value) ||
          'other';

        const issueSubcategory =
          normalizeString(dynamicVars?.issue_subcategory) ||
          normalizeString(dataCollection?.issue_subcategory?.value) ||
          normalizeString(dataCollection?.subcategory?.value);

        const issueLocation =
          normalizeString(dynamicVars?.issue_location) ||
          normalizeString(dataCollection?.issue_location?.value) ||
          normalizeString(dataCollection?.location?.value);

        const issueDescription =
          normalizeString(dataCollection?.issue_description?.value) ||
          normalizeString(postCallData?.analysis?.transcript_summary) ||
          normalizeString(postCallData?.analysis?.summary) ||
          normalizeString(userOnlyTranscript) ||
          normalizeString(transcriptText) ||
          'No description provided';

        let urgencyLevel =
          normalizeString(dynamicVars?.urgency_level) ||
          normalizeString(dataCollection?.urgency_level?.value) ||
          'normal';

        const specialInstructions =
          normalizeString(dynamicVars?.special_instructions) ||
          normalizeString(dataCollection?.special_instructions?.value);

        const preferredContactTime =
          normalizeString(dynamicVars?.preferred_contact_time) ||
          normalizeString(dataCollection?.preferred_contact_time?.value);

        const preferredAccessTime =
          normalizeString(dynamicVars?.preferred_access_time) ||
          normalizeString(dataCollection?.preferred_access_time?.value);

        const hasPets =
          parseBoolean(dynamicVars?.has_pets) ??
          parseBoolean(dataCollection?.has_pets?.value) ??
          false;

        const isEmergency =
          parseBoolean(dynamicVars?.is_emergency) ??
          parseBoolean(dataCollection?.is_emergency?.value);

        const callDurationSeconds =
          postCallData?.metadata?.call_duration_seconds ||
          postCallData?.metadata?.call_duration_secs ||
          postCallData?.call_duration_seconds ||
          postCallData?.duration_seconds;

        const callRecordingUrl =
          normalizeString(postCallData?.recording_url) ||
          normalizeString(postCallData?.metadata?.recording_url);

        const callStartedAt =
          normalizeString(postCallData?.metadata?.call_started_at) ||
          normalizeString(postCallData?.metadata?.call_start_time);

        const callEndedAt =
          normalizeString(postCallData?.metadata?.call_ended_at) ||
          normalizeString(postCallData?.metadata?.call_end_time);

        let emergencyDetected = isEmergency ?? false;

        try {
          const configQuery = supabase
            .from('voice_agent_config')
            .select('emergency_keywords');

          const { data: config } = await (propertyId
            ? configQuery.eq('property_id', propertyId)
            : configQuery.is('property_id', null)
          ).maybeSingle();

          const keywords = config?.emergency_keywords || [
            'flood',
            'fire',
            'gas leak',
            'no heat',
            'no water',
            'broken window',
            'security',
          ];

          const transcriptForScan = `${issueDescription} ${userOnlyTranscript || ''}`.toLowerCase();
          if (!emergencyDetected) {
            emergencyDetected = keywords.some((keyword: string) =>
              transcriptForScan.includes(keyword.toLowerCase())
            );
          }
        } catch (configError) {
          console.error('Error fetching emergency keywords:', configError);
        }

        if (emergencyDetected) {
          urgencyLevel = 'emergency';
        }

        if (!conversationId) {
          console.error('Missing conversation_id in post_call_transcription payload');
          break;
        }

        const { data: existingRequest, error: existingError } = await supabase
          .from('maintenance_requests')
          .select('id')
          .eq('call_id', conversationId)
          .maybeSingle();

        if (existingError) {
          console.error('Error checking for existing request:', existingError);
        }

        if (existingRequest?.id) {
          const { error: updateError } = await supabase
            .from('maintenance_requests')
            .update({
              call_transcript: transcriptText || userOnlyTranscript || issueDescription,
              call_duration_seconds: callDurationSeconds,
              call_recording_url: callRecordingUrl,
              call_ended_at: callEndedAt || new Date().toISOString(),
              issue_description: issueDescription,
              issue_category: issueCategory,
              issue_subcategory: issueSubcategory,
              issue_location: issueLocation,
              urgency_level: urgencyLevel,
              is_emergency: emergencyDetected,
              preferred_contact_time: preferredContactTime,
              preferred_access_time: preferredAccessTime,
              has_pets: hasPets,
              special_access_instructions: specialInstructions,
            })
            .eq('id', existingRequest.id);

          if (updateError) {
            console.error('Error updating request from post_call_transcription:', updateError);
          }
          break;
        }

        const { error: insertError } = await supabase
          .from('maintenance_requests')
          .insert({
            caller_name: callerName,
            caller_phone: callerPhone,
            caller_email: callerEmail,
            caller_unit_number: unitNumber,
            property_id: propertyId,
            unit_id: unitId,
            issue_category: issueCategory,
            issue_subcategory: issueSubcategory,
            issue_description: issueDescription,
            issue_location: issueLocation,
            urgency_level: urgencyLevel,
            is_emergency: emergencyDetected,
            preferred_contact_time: preferredContactTime,
            preferred_access_time: preferredAccessTime,
            has_pets: hasPets,
            special_access_instructions: specialInstructions,
            call_id: conversationId,
            call_started_at: callStartedAt || new Date().toISOString(),
            call_ended_at: callEndedAt || new Date().toISOString(),
            call_duration_seconds: callDurationSeconds,
            call_transcript: transcriptText || userOnlyTranscript || issueDescription,
            call_recording_url: callRecordingUrl,
            status: 'new',
          });

        if (insertError) {
          console.error('Error creating request from post_call_transcription:', insertError);
        }

        break;
      }

      default:
        console.log('Unknown event type:', eventType);
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
