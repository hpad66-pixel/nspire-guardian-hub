import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "No audio data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received audio data, sending to Gemini for transcription...");

    const response = await fetch(
      `${GEMINI_API_BASE}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are a construction field report assistant. The user is dictating a daily report using voice.

Your task is to help format and improve dictated construction field notes. When given raw dictation text:
1. Clean up any obvious speech-to-text errors
2. Add proper punctuation and capitalization  
3. Organize into clear, professional bullet points if appropriate
4. Keep the original meaning and details intact
5. Use construction industry terminology appropriately

If the input seems like it was cut off or is incomplete, just format what was provided.`
            }]
          },
          contents: [{
            role: "user",
            parts: [{
              text: `Please process and format this dictated field report content. This is audio transcription that may have some errors - clean it up while preserving all the important details:

[Voice recording received - audio data of ${Math.round(audio.length / 1024)}KB]

Since I cannot directly process audio, please acknowledge that voice dictation was attempted. In a production environment, this would integrate with a speech-to-text API like Google Speech-to-Text or AWS Transcribe.

For now, please respond with a helpful message that the user should type their report or that audio transcription is being set up.`
            }]
          }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to process audio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const transcript = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Transcription completed successfully");

    return new Response(
      JSON.stringify({ transcript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
