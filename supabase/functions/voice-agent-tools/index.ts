import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; details?: string; hint?: string; error?: string };
    return [e.message || e.error, e.code, e.details, e.hint].filter(Boolean).join(' | ') || JSON.stringify(error);
  }
  return String(error);
}

function asText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    // Support both { tool_name, parameters } and a bare parameters body with ?tool=
    const url = new URL(req.url);
    const tool_name = body?.tool_name || url.searchParams.get('tool');
    const parameters = body?.parameters || (body?.tool_name ? {} : body) || {};
    console.log('Tool call received:', tool_name, parameters);

    if (!tool_name) {
      return new Response(
        JSON.stringify({ error: 'Missing tool_name' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    let result: Record<string, unknown>;

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
          message: data ? `Unit ${unit_number} verified` : `Unit ${unit_number} not found`,
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

        if (!property_id) {
          throw new Error('property_id is required to create a maintenance request / work order');
        }

        const { data, error } = await supabase
          .from('maintenance_requests')
          .insert({
            caller_name: asText(caller_name, 'Resident'),
            // DB column is NOT NULL — voice calls often omit phone
            caller_phone: asText(caller_phone, 'not provided'),
            caller_email: caller_email || null,
            caller_unit_number: unit_number || null,
            property_id,
            unit_id: unit_id || null,
            issue_category: asText(issue_category, 'other'),
            issue_subcategory: issue_subcategory || null,
            issue_description: asText(issue_description, 'No description provided'),
            issue_location: issue_location || null,
            urgency_level: urgency_level || 'normal',
            is_emergency: Boolean(is_emergency),
            preferred_contact_time: preferred_contact_time || null,
            preferred_access_time: preferred_access_time || null,
            has_pets: Boolean(has_pets),
            special_access_instructions: special_instructions || null,
            call_id: call_id || null,
            call_started_at: new Date().toISOString(),
            status: 'new',
          })
          .select('id, ticket_number, work_order_id')
          .single();

        if (error) throw error;

        // AFTER INSERT trigger sets work_order_id; re-read if racey
        let workOrderId = data.work_order_id;
        if (!workOrderId) {
          const { data: again } = await supabase
            .from('maintenance_requests')
            .select('work_order_id')
            .eq('id', data.id)
            .maybeSingle();
          workOrderId = again?.work_order_id ?? null;
        }

        result = {
          success: true,
          request_id: data.id,
          ticket_number: data.ticket_number,
          work_order_id: workOrderId,
          formatted_ticket: `MR-${String(data.ticket_number).padStart(4, '0')}`,
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
          formatted: `MR-${String(data.ticket_number).padStart(4, '0')}`,
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
    return new Response(
      JSON.stringify({ error: errorMessage(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
