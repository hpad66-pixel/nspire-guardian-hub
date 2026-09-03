import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { logAiUsage } from '../_shared/aiUsage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the ProjOS Field Photo Assistant. Analyze only the supplied project photograph, its verified metadata, and the user's note. Never use facts from another tenant, project, or outside source.

Return ONLY strict JSON matching this shape:
{"caption":"concise factual caption","category":"one allowed category","severity":"low|medium|high|critical","visible_location_clues":["..."],"clarification_questions":["..."],"evidence_warning":"...","observed":["..."],"inferred":["..."]}

Allowed categories: life_safety, water_intrusion, building_envelope, grounds, cleanliness, electrical, plumbing, hvac, structural, accessibility, security, other.

Distinguish visible observations from inference. Never state that work was completed, code compliant, safe, or accepted. Never invent a date, address, person, unit, asset, cause, measurement, or responsible party. If uncertain, use category "other", severity "medium", and ask a focused question. Preserve every confirmed fact in the user's note. Suggestions are advisory and require human approval.`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI returned an invalid suggestion');
  return parsed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
    if (!supabaseUrl || !anonKey || !serviceKey || !anthropicKey) throw new Error('Field photo AI is not configured');

    const { photoLinkId } = await req.json();
    if (!photoLinkId) return new Response(JSON.stringify({ error: 'photoLinkId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: link, error: linkError } = await userClient
      .from('field_accountability_photos')
      .select('id, project_id, photo:photos(id,storage_path,thumb_path,caption,taken_at,lat,lng)')
      .eq('id', photoLinkId)
      .single();
    if (linkError || !link?.photo) return new Response(JSON.stringify({ error: 'Photo not found or not authorized' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const photo = Array.isArray(link.photo) ? link.photo[0] : link.photo;
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: file, error: downloadError } = await admin.storage.from('project-photos').download(photo.thumb_path || photo.storage_path);
    if (downloadError || !file) throw downloadError || new Error('Photo could not be read');
    if (file.size > 5_000_000) return new Response(JSON.stringify({ error: 'This image is too large for AI review. A thumbnail is still being prepared.' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const mediaType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ? file.type : 'image/jpeg';
    const imageData = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
    const model = 'claude-sonnet-4-6';
    const started = Date.now();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
          { type: 'text', text: `Verified metadata: ${JSON.stringify({ caption: photo.caption, taken_at: photo.taken_at, lat: photo.lat, lng: photo.lng })}` },
        ] }],
      }),
    });
    if (!response.ok) throw new Error(`AI review failed (${response.status})`);
    const result = await response.json();
    await logAiUsage({ req, skill: 'field_photo_assist', model, anthropicJson: result, projectId: link.project_id, latencyMs: Date.now() - started });
    const suggestion = parseJson(result.content?.[0]?.text || '{}');

    const { error: updateError } = await userClient.from('field_accountability_photos').update({ ai_suggestion: suggestion }).eq('id', photoLinkId);
    if (updateError) throw updateError;
    return new Response(JSON.stringify({ suggestion }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Field photo AI failed';
    console.error(message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
