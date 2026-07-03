import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, property_id, caller_name, issue_category } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: "Transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const systemPrompt = `You are a maintenance issue extraction assistant for property management.
Analyze the following call transcript between a tenant and a voice agent. Extract distinct, actionable maintenance issues.

For each issue provide:
- title: A clear, professional title (max 60 chars)
- description: A detailed description of the issue based on what the caller reported (2-3 sentences)
- severity: "severe" (safety hazard, emergency, water damage), "moderate" (affects daily living, needs prompt attention), or "low" (cosmetic, minor inconvenience)
- area: "unit" (inside the tenant's unit), "inside" (common indoor areas), or "outside" (exterior, grounds, parking)
- category: The maintenance category (plumbing, electrical, hvac, appliance, structural, pest, general)

Rules:
- Extract ONLY distinct actionable maintenance issues
- Do NOT duplicate issues if the caller mentions the same problem multiple times
- Use professional language, not the caller's exact words
- Assign severity based on urgency keywords and safety implications
- If the caller mentions an emergency (flooding, gas leak, fire, no heat in winter), mark as "severe"

Respond ONLY with a valid JSON object in this exact format, no markdown fences:
{"issues":[{"title":"string","description":"string","severity":"severe|moderate|low","area":"unit|inside|outside","category":"string"}]}`;

    const userPrompt = `Caller: ${caller_name || "Unknown"}
Reported Category: ${issue_category || "general"}
Property ID: ${property_id || "unknown"}

TRANSCRIPT:
${transcript}`;

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    await logAiUsage({ req, skill: "transcript_issues", model: MODEL, anthropicJson: data, projectId: null });
    let rawText: string = data.content?.[0]?.text ?? "";
    if (!rawText) {
      throw new Error("No issues extracted from transcript");
    }

    const fence = rawText.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
    if (fence) rawText = fence[1].trim();

    const parsed = JSON.parse(rawText);
    const issues = parsed.issues || [];

    return new Response(
      JSON.stringify({ issues }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-transcript-issues error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
