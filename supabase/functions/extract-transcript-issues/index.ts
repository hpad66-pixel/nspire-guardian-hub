import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
- If the caller mentions an emergency (flooding, gas leak, fire, no heat in winter), mark as "severe"`;

    const userPrompt = `Caller: ${caller_name || "Unknown"}
Reported Category: ${issue_category || "general"}
Property ID: ${property_id || "unknown"}

TRANSCRIPT:
${transcript}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_issues",
              description: "Extract maintenance issues from the call transcript",
              parameters: {
                type: "object",
                properties: {
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Clear issue title, max 60 chars" },
                        description: { type: "string", description: "Detailed description, 2-3 sentences" },
                        severity: { type: "string", enum: ["severe", "moderate", "low"] },
                        area: { type: "string", enum: ["unit", "inside", "outside"] },
                        category: { type: "string" },
                      },
                      required: ["title", "description", "severity", "area", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["issues"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_issues" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No issues extracted from transcript");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
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
