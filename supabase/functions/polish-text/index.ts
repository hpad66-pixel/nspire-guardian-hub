import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const contextPrompts: Record<string, string> = {
  description: "Transform this into a clear, professional project description. Maintain all factual content. Use complete sentences and proper grammar. Keep the same meaning but make it polished and professional. Output only the improved text, no explanations.",
  scope: "Structure this as a professional scope of work. Use numbered or bulleted lists for deliverables if there are multiple items. Be specific about what is included. Keep the same meaning but make it polished and professional. Output only the improved text, no explanations.",
  notes: "Polish these notes for professional documentation. Fix grammar, improve clarity, and maintain the original meaning. Make it suitable for formal records. Output only the improved text, no explanations.",
  correspondence: "Refine this into professional business correspondence. Maintain a formal yet friendly tone. Ensure proper structure and professional language. Output only the improved text, no explanations.",
  meeting_minutes: `Transform these raw meeting notes into formal, structured meeting minutes. Use the following format:

**MEETING MINUTES**

**Date & Time:** [extract from notes or leave as provided]
**Location:** [extract or leave blank]
**Attendees:** [list all mentioned attendees]

---

**1. CALL TO ORDER / OPENING**
[Brief opening summary]

**2. AGENDA ITEMS DISCUSSED**
[Numbered list of topics discussed with brief summaries]

**3. KEY DECISIONS MADE**
[Bullet list of all decisions reached]

**4. ACTION ITEMS**
| Action Item | Responsible Party | Due Date |
|---|---|---|
[Table of action items extracted from notes]

**5. NEXT STEPS / UPCOMING MEETINGS**
[Summary of follow-ups and next meeting details if mentioned]

---
*Minutes prepared by [leave blank for signature]*

Maintain all factual content. Fix grammar and improve clarity. Output only the formatted minutes, no explanations.`,
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service is not configured');
    }

    const { text, context = 'notes' } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Polishing text with context: ${context}, length: ${text.length}`);

    const systemPrompt = contextPrompts[context] || contextPrompts.notes;

    // Try models in order — fall back if credits exhausted on one
    const modelsToTry = ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash'];
    let lastStatus = 0;

    for (const model of modelsToTry) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          stream: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const polished = result.choices?.[0]?.message?.content || text;
        console.log(`Successfully polished text with model: ${model}`);
        return new Response(
          JSON.stringify({ polished }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lastStatus = response.status;

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        console.warn(`Model ${model} returned 402, trying next model...`);
        // Try next model in the list
        continue;
      }

      // Other non-OK status — log and fail fast
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI service error');
    }

    // All models exhausted credits
    return new Response(
      JSON.stringify({ error: 'AI credits exhausted. Please add credits to your Lovable workspace to continue.' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
