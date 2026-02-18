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

// Google Gemini API endpoint
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(apiKey: string, model: string, systemPrompt: string, userText: string): Promise<Response> {
  // Map internal model names to stable Gemini model IDs
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

    const systemPrompt = contextPrompts[context] || contextPrompts.notes;

    // Model routing: meeting_minutes → Pro, others → Flash
    // Use stable model names — all map to gemini-2.0-flash or gemini-2.0-flash-lite
    const defaultModel = 'google/gemini-2.5-flash';
    const modelsToTry = [defaultModel, 'google/gemini-2.5-flash-lite'];

    for (const model of modelsToTry) {
      const response = await callGemini(GEMINI_API_KEY, model, systemPrompt, text);

      if (response.ok) {
        const result = await response.json();
        const polished = result.candidates?.[0]?.content?.parts?.[0]?.text || text;
        console.log(`Successfully polished text with model: ${model}`);
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

      // Other errors — try next model
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
