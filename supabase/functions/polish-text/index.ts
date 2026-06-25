import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { STYLE_RULES } from "../_shared/ai-style-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Hardcoded fallback prompts — used when no DB row exists for the context key
const contextPrompts: Record<string, string> = {
  description: "Transform this into a clear, professional project description. Maintain all factual content. Use complete sentences and proper grammar. Keep the same meaning but make it polished and professional. Output only the improved text, no explanations.",
  scope: "Structure this as a professional scope of work. Use numbered or bulleted lists for deliverables if there are multiple items. Be specific about what is included. Keep the same meaning but make it polished and professional. Output only the improved text, no explanations.",
  notes: "Polish these notes for professional documentation. Fix grammar, improve clarity, and maintain the original meaning. Make it suitable for formal records. Output only the improved text, no explanations.",
  correspondence: "Refine this into professional business correspondence. Maintain a formal yet friendly tone. Ensure proper structure and professional language. Output only the improved text, no explanations.",
  ai_continue: `You are a senior project management consultant with 30 years of experience writing formal project documentation. Continue writing the following text naturally, as a professional continuation. Write in a formal, authoritative, and precise tone. Do not repeat any of the existing text. Do not add headings or labels. Output ONLY the continuation text, one to three complete, well-constructed sentences that flow naturally from what was written. No explanations, no preamble.`,
  meeting_minutes: `You turn raw construction progress-meeting notes into clean, CONCISE meeting minutes as HTML. Be brief and factual. Every line carries information.

Output ONLY valid HTML (no markdown, no code fences, no asterisks). Allowed tags: <h2>, <h3>, <p>, <ul>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>. Keep paragraphs to 1-2 sentences.

Produce these sections IN ORDER, and OMIT any section that has no content (do not write "none" or placeholders):

<h2>Summary</h2>
2-4 tight sentences: what was covered and the headline status.

<h2>Progress</h2>
<ul> of what advanced or completed since the last meeting, one crisp bullet each (area/trade + status). Include %, quantities, or dates only if stated.

<h2>Decisions</h2>
<ul> of decisions made, one sentence each, with any condition or date.

<h2>Risks &amp; Issues</h2>
<ul> of open risks/issues, each gives the issue, its impact (schedule/cost), and owner if stated.

<h2>Action Items</h2>
An HTML <table> with columns: Action | Owner | Due | Priority. One row per action. Use "TBD" if no due date is given; infer priority (High/Medium/Low) from context.

<h2>Next Steps</h2>
Short <ul> of follow-ups, plus the next meeting date/time if mentioned.

Rules: preserve EVERY real fact (names, dates, amounts, trades) from the notes; never invent them. Do NOT add distribution, approval, or signature blocks. Concise above all.`,
};

async function callClaude(apiKey: string, model: string, systemPrompt: string, userText: string): Promise<Response> {
  return await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, context = 'notes', preferredModel } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Polishing text with context: ${context}, length: ${text.length}`);

    // --- Step 1: Check database for a configurable skill prompt ---
    let systemPrompt = contextPrompts[context] || contextPrompts.notes;
    let dbModel: string | null = null;

    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: skillRow } = await supabaseAdmin
        .from('ai_skill_prompts')
        .select('system_prompt, model, is_active')
        .eq('skill_key', context)
        .eq('is_active', true)
        .single();

      if (skillRow) {
        console.log(`Found DB skill prompt for context: ${context}, model: ${skillRow.model}`);
        systemPrompt = skillRow.system_prompt;
        dbModel = skillRow.model;
      }
    } catch (dbErr) {
      console.warn('Could not fetch skill prompt from DB, using hardcoded fallback:', dbErr);
    }

    // --- Step 2: Claude only. Legacy/non-claude model values normalize to Sonnet. ---
    const requested = dbModel ?? preferredModel ?? 'claude-sonnet-4-6';
    const model = requested.startsWith('claude') ? requested : 'claude-sonnet-4-6';

    // Apply the platform style guard to every polished output.
    const fullSystem = `${systemPrompt}\n\n${STYLE_RULES}`;

    const claudeResp = await callClaude(ANTHROPIC_API_KEY, model, fullSystem, text);

    if (claudeResp.ok) {
      const result = await claudeResp.json();
      let polished: string = result.content?.[0]?.text || text;

      // Strip markdown code fences if Claude wraps HTML
      const fenceMatch = polished.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/i);
      if (fenceMatch) polished = fenceMatch[1].trim();

      console.log(`Successfully polished text with Claude model: ${model}`);
      return new Response(
        JSON.stringify({ polished, model }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (claudeResp.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeErr = await claudeResp.text();
    console.error(`Claude ${model} returned ${claudeResp.status}:`, claudeErr);
    // Graceful: hand back the original text so the UI can keep going.
    return new Response(
      JSON.stringify({ polished: null, warning: 'generation_failed', original: text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Polish text error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
