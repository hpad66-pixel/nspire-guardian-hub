import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  ai_continue: `You are a senior project management consultant with 30 years of experience writing formal project documentation. Continue writing the following text naturally, as a seamless professional continuation. Write in a formal, authoritative, and precise tone — the quality of a McKinsey or Bain engagement report. Do not repeat any of the existing text. Do not add headings or labels. Output ONLY the continuation text — one to three complete, well-constructed sentences that flow naturally from what was written. No explanations, no preamble.`,
  meeting_minutes: `You are a senior partner at a top-tier management consulting firm (McKinsey, BCG, or Bain caliber) who specializes in project management and governance documentation. Your task is to transform raw meeting notes into formal, publication-quality meeting minutes that would be appropriate for board-level review or client submission.

CRITICAL FORMATTING RULES:
- Output ONLY valid HTML — no markdown, no asterisks, no hash symbols, no special characters for formatting
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <em>, <hr>
- Every section heading must be an <h2> tag
- Every sub-heading must be an <h3> tag  
- All body text must be in <p> tags with full, complete sentences
- Action items MUST be rendered as a proper HTML <table> with columns: Action Item | Responsible Party | Due Date | Priority
- Lists must use <ul><li> or <ol><li> tags — never dashes or bullet characters
- Do not use any markdown syntax whatsoever

CONTENT REQUIREMENTS — Write with precision, authority, and depth:

<h2>1. EXECUTIVE SUMMARY</h2>
Write 2-3 substantive paragraphs summarizing the meeting's purpose, key outcomes, and overall project status. Be expansive — this should read like a consulting partner's summary memo. Describe the meeting context, what was reviewed, what was decided, and the implications for the project.

<h2>2. AGENDA ITEMS DISCUSSED</h2>
For each topic raised in the notes, write a numbered <h3> section (e.g., "2.1 Schedule Review", "2.2 Budget Status") with a full paragraph of narrative — not bullet points. Describe what was discussed, what concerns were raised, what context was provided, and how the discussion evolved. Be thorough, not cryptic.

<h2>3. KEY DECISIONS MADE</h2>
List each decision as a complete, formal sentence in <ul><li> format. Each item should state the decision clearly and include any conditions or qualifications. Example: "The team resolved to extend the mechanical rough-in deadline by fourteen (14) calendar days, contingent upon receipt of revised shop drawings from the MEP subcontractor by Friday, February 21, 2026."

<h2>4. RISKS AND ISSUES IDENTIFIED</h2>
Identify any risks, concerns, or issues mentioned in the notes. For each, provide: the risk/issue description, potential impact on schedule or budget, assigned owner (if mentioned), and recommended mitigation. Present as structured <p> paragraphs or a <ul> list.

<h2>5. ACTION ITEMS</h2>
Extract ALL action items and render as an HTML table:
<table><thead><tr><th>Action Item</th><th>Responsible Party</th><th>Due Date</th><th>Priority</th></tr></thead><tbody>...</tbody></table>
If no due date is mentioned, write "To be confirmed." If priority is not stated, infer it from context (High / Medium / Low).

<h2>6. NEXT STEPS AND UPCOMING MEETINGS</h2>
Summarize follow-up activities, next scheduled meetings, and any preparation required by participants. Write in full sentences.

<h2>7. DISTRIBUTION AND APPROVAL</h2>
<p>These minutes are circulated to all meeting attendees for review and approval. Any corrections or amendments must be submitted within five (5) business days of receipt. Upon expiration of the review period, these minutes shall be deemed approved as presented.</p>
<p><em>Minutes prepared by: _____________________________ &nbsp;&nbsp;&nbsp; Date: _____________________________</em></p>

Maintain ALL factual information from the raw notes. Do not invent names, dates, or amounts not present in the notes — but do infer reasonable context where the notes are ambiguous. Output ONLY the HTML content described above — no explanations, no preamble, no markdown.`,
};

// Google Gemini API endpoint
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(apiKey: string, model: string, systemPrompt: string, userText: string): Promise<Response> {
  const modelMap: Record<string, string> = {
    "google/gemini-2.5-pro": "gemini-2.0-flash",
    "google/gemini-3-flash-preview": "gemini-2.0-flash",
    "google/gemini-2.5-flash": "gemini-2.0-flash",
    "google/gemini-2.5-flash-lite": "gemini-2.0-flash-lite",
  };
  const geminiModel = modelMap[model] || "gemini-2.0-flash";

  return await fetch(`${GEMINI_API_BASE}/${geminiModel}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
    }),
  });
}

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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('AI service is not configured');
    }

    const { text, context = 'notes', preferredModel } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Polishing text with context: ${context}, preferredModel: ${preferredModel ?? 'default'}, length: ${text.length}`);

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
      // Non-fatal: fall back to hardcoded prompt
      console.warn('Could not fetch skill prompt from DB, using hardcoded fallback:', dbErr);
    }

    // --- Step 2: Route to Claude if the DB row specifies a claude model ---
    const resolvedModel = dbModel ?? preferredModel ?? 'google/gemini-2.5-flash';

    if (resolvedModel.startsWith('claude')) {
      const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
      if (ANTHROPIC_API_KEY) {
        console.log(`Routing to Claude: ${resolvedModel}`);
        const claudeResp = await callClaude(ANTHROPIC_API_KEY, resolvedModel, systemPrompt, text);

        if (claudeResp.ok) {
          const result = await claudeResp.json();
          const polished = result.content?.[0]?.text || text;
          console.log(`Successfully polished text with Claude model: ${resolvedModel}`);
          return new Response(
            JSON.stringify({ polished, model: resolvedModel }),
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
        console.warn(`Claude ${resolvedModel} returned ${claudeResp.status}, falling through to Gemini:`, claudeErr);
        // Fall through to Gemini below
      } else {
        console.warn('ANTHROPIC_API_KEY not configured — falling through to Gemini');
      }
    }

    // --- Step 3: Gemini path (default + Claude fallback) ---
    const defaultModel = 'google/gemini-2.5-flash';
    const modelsToTry = [defaultModel, 'google/gemini-2.5-flash-lite'];

    for (const model of modelsToTry) {
      const response = await callGemini(GEMINI_API_KEY, model, systemPrompt, text);

      if (response.ok) {
        const result = await response.json();
        const polished = result.candidates?.[0]?.content?.parts?.[0]?.text || text;
        console.log(`Successfully polished text with Gemini model: ${model}`);
        return new Response(
          JSON.stringify({ polished, model }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 403 || response.status === 401) {
        const errorText = await response.text();
        console.error('Gemini API auth error:', response.status, errorText);
        throw new Error('Invalid Gemini API key or quota exceeded');
      }

      const errorText = await response.text();
      console.warn(`Model ${model} returned ${response.status}, trying next...`, errorText);
    }

    // All models failed — return original text with warning
    return new Response(
      JSON.stringify({ polished: null, warning: 'credits_exhausted', original: text }),
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
