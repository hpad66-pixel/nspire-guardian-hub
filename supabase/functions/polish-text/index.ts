import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";
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
  meeting_minutes: `You convert a raw construction meeting transcript into a clean, professional set of meeting minutes written for the project owner and client to read. The input is often an auto-generated transcript: messy, with filler, false starts, cross-talk, and no punctuation. Clean it up and turn spoken fragments into clear, declarative written sentences. Be concise and factual. Every line earns its place.

Output ONLY valid semantic HTML. NEVER output markdown, asterisks, backticks, or code fences. Use ONLY these tags: <h2>, <h3>, <p>, <ul>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>. Do not add class, style, <html>, or <body>. Keep paragraphs to 1-2 sentences.

Produce these sections IN THIS EXACT ORDER. OMIT any section that has no real content (never output an empty section, "none", "N/A", or a placeholder):

<h2>Executive Summary</h2>
A <p> of 2 to 4 tight sentences: what the meeting covered and the headline status (on track, behind, or blocked).

<h2>Progress &amp; Status</h2>
A <ul>, one <li> per area or trade that advanced. Each: <strong>Area or trade</strong> then its status, including any percentage, quantity, station, or date that was actually stated.

<h2>Decisions</h2>
A <ul>, one <li> per decision made, one sentence each, with any condition, owner, or date.

<h2>Risks &amp; Issues</h2>
A <ul>, one <li> per open risk or issue. Each: <strong>the issue</strong>, its impact on schedule or cost, and the responsible party if stated.

<h2>Action Items</h2>
A <table> with a <thead> header row of exactly: Action, Owner, Due Date, Priority. Then a <tbody> with one <tr> per action. Owner is the named person or company responsible. Due Date is the stated date or "TBD". Priority is High, Medium, or Low, inferred from urgency. Capture EVERY commitment, task, or follow-up mentioned in the transcript.

<h2>General Notes</h2>
A <ul> of any noteworthy items that do not belong in the sections above: clarifications, coordination notes, materials or deliveries, site observations, or money figures mentioned. Omit this section entirely if there is nothing to add.

<h2>Next Steps &amp; Next Meeting</h2>
A <ul> of immediate follow-ups, with a final <li> stating the next meeting date and time if mentioned.

Hard rules:
- Preserve every real fact: names, companies, dates, dollar amounts, quantities, station numbers, change-order and RFI numbers, trades. Never invent any.
- Attribute every action and decision to the correct named owner whenever the transcript makes it clear.
- Remove filler, repetition, and cross-talk. Do not transcribe verbatim; write polished minutes.
- No distribution lists, no approval blocks, no signature blocks.
- Professional, declarative, owner-facing, and to the point.`,
};

async function callClaude(apiKey: string, model: string, systemPrompt: string, userText: string, maxTokens = 4096): Promise<Response> {
  return await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    }),
  });
}

/** True if the text already contains block-level HTML we expect from a report. */
function looksLikeHtml(s: string): boolean {
  return /<(h2|h3|p|ul|ol|li|table|thead|tbody|tr|th|td|strong)\b/i.test(s);
}

/** Minimal, safe Markdown -> HTML fallback so a model that slips into Markdown
 *  (## headings, - bullets, **bold**, | pipe tables |) still renders with real
 *  headings, bullets and tables instead of garbled raw text. Only used when the
 *  output is NOT already HTML. */
function mdToHtml(md: string): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>');
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { i++; continue; }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const lvl = Math.min(h[1].length + 1, 3); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); i++; continue; }
    if (t.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
      const cells = (r: string) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      const header = cells(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(cells(lines[i])); i++; }
      out.push('<table><thead><tr>' + header.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^[-*+]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) { items.push(`<li>${inline(lines[i].trim().replace(/^[-*+]\s+/, ''))}</li>`); i++; }
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }
    if (/^\d+\.\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(`<li>${inline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`); i++; }
      out.push('<ol>' + items.join('') + '</ol>');
      continue;
    }
    out.push(`<p>${inline(t)}</p>`);
    i++;
  }
  return out.join('\n');
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
        // Meeting minutes MUST use the hardcoded, format-strict prompt so a stale or
        // markdown-y DB row can never garble the report. We still honor the DB model.
        if (context !== 'meeting_minutes') systemPrompt = skillRow.system_prompt;
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

    // Meeting minutes can be long (full transcripts) and must never truncate mid-table.
    const maxTokens = context === 'meeting_minutes' ? 8000 : 4096;
    const claudeResp = await callClaude(ANTHROPIC_API_KEY, model, fullSystem, text, maxTokens);

    if (claudeResp.ok) {
      const result = await claudeResp.json();
      await logAiUsage({ req, skill: "polish_text", model, anthropicJson: result, projectId: null });
      let polished: string = result.content?.[0]?.text || text;

      // Strip markdown code fences if Claude wraps HTML
      const fenceMatch = polished.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/i);
      if (fenceMatch) polished = fenceMatch[1].trim();

      // Guarantee HTML for the report contexts: if the model slipped into Markdown
      // (no HTML tags present), convert it so tables/bullets/headings still render.
      if (context === 'meeting_minutes' && !looksLikeHtml(polished)) {
        polished = mdToHtml(polished);
      }

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
