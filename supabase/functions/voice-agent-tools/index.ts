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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { tool_name, parameters } = await req.json();
    console.log('Tool call received:', tool_name, parameters);

    let result: any;

    switch (tool_name) {
      case 'lookup_property': {
        const { query } = parameters;
        const { data, error } = await supabase
          .from('properties')
          .select('id, name, address, city, state')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
          .limit(5);

        if (error) throw error;
        result = { properties: data || [], found: (data?.length || 0) > 0 };
        break;
      }

      case 'verify_unit': {
        const { property_id, unit_number } = parameters;
        const { data, error } = await supabase
          .from('units')
          .select('id, unit_number, status')
          .eq('property_id', property_id)
          .ilike('unit_number', unit_number)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        result = { 
          verified: !!data, 
          unit: data,
          message: data ? `Unit ${unit_number} verified` : `Unit ${unit_number} not found`
        };
        break;
      }

      case 'create_maintenance_request': {
        const {
          caller_name,
          caller_phone,
          caller_email,
          unit_number,
          property_id,
          unit_id,
          issue_category,
          issue_subcategory,
          issue_description,
          issue_location,
          urgency_level,
          is_emergency,
          preferred_contact_time,
          preferred_access_time,
          has_pets,
          special_instructions,
          call_id,
        } = parameters;

        const { data, error } = await supabase
          .from('maintenance_requests')
          .insert({
            caller_name,
            caller_phone,
            caller_email,
            caller_unit_number: unit_number,
            property_id,
            unit_id,
            issue_category,
            issue_subcategory,
            issue_description,
            issue_location,
            urgency_level: urgency_level || 'normal',
            is_emergency: is_emergency || false,
            preferred_contact_time,
            preferred_access_time,
            has_pets: has_pets || false,
            special_access_instructions: special_instructions,
            call_id,
            call_started_at: new Date().toISOString(),
            status: 'new',
          })
          .select('id, ticket_number')
          .single();

        if (error) throw error;
        
        result = { 
          success: true, 
          request_id: data.id,
          ticket_number: data.ticket_number,
          formatted_ticket: `MR-${String(data.ticket_number).padStart(4, '0')}`
        };
        break;
      }

      case 'get_ticket_number': {
        const { request_id } = parameters;
        const { data, error } = await supabase
          .from('maintenance_requests')
          .select('ticket_number')
          .eq('id', request_id)
          .single();

        if (error) throw error;
        result = { 
          ticket_number: data.ticket_number,
          formatted: `MR-${String(data.ticket_number).padStart(4, '0')}`
        };
        break;
      }

      case 'update_call_data': {
        const { request_id, call_transcript, call_duration_seconds, call_recording_url } = parameters;
        const { error } = await supabase
          .from('maintenance_requests')
          .update({
            call_transcript,
            call_duration_seconds,
            call_recording_url,
            call_ended_at: new Date().toISOString(),
          })
          .eq('id', request_id);

        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        result = { error: `Unknown tool: ${tool_name}` };
    }

    console.log('Tool result:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error in voice-agent-tools:', error);
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
