import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GenerateProposalRequest {
  projectId: string;
  proposalType: string;
  templateId?: string;
  userNotes?: string;
  subject?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const body: GenerateProposalRequest = await req.json();
    const { projectId, proposalType, templateId, userNotes, subject } = body;

    if (!projectId || !proposalType) {
      return new Response(JSON.stringify({ error: "Missing required fields: projectId and proposalType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`*, property:properties(name, address, city, state)`)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template
    let template;
    if (templateId) {
      const { data } = await supabase.from("proposal_templates").select("*").eq("id", templateId).single();
      template = data;
    } else {
      const { data } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("proposal_type", proposalType)
        .eq("is_default", true)
        .single();
      template = data;
    }

    if (!template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatBudget = (budget: number | null) => {
      if (!budget) return "TBD";
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(budget);
    };

    const prompt = template.prompt_template
      .replace(/\{\{project_name\}\}/g, project.name || "N/A")
      .replace(/\{\{property_name\}\}/g, project.property?.name || "N/A")
      .replace(/\{\{project_description\}\}/g, project.description || "N/A")
      .replace(/\{\{project_scope\}\}/g, project.scope || "N/A")
      .replace(/\{\{budget\}\}/g, formatBudget(project.budget))
      .replace(/\{\{start_date\}\}/g, project.start_date || "TBD")
      .replace(/\{\{target_end_date\}\}/g, project.target_end_date || "TBD")
      .replace(/\{\{project_status\}\}/g, project.status || "N/A")
      .replace(/\{\{user_notes\}\}/g, userNotes || "")
      .replace(/\{\{subject\}\}/g, subject || "");

    const systemPrompt = `You are a professional business consultant and proposal writer with expertise in construction, property management, and project management.

Generate clear, professional, and persuasive business documents.

IMPORTANT FORMATTING RULES:
- Output in clean HTML format suitable for a rich text editor
- Use semantic HTML tags: <h2> for main sections, <h3> for subsections, <p> for paragraphs, <ul>/<li> for bullet lists, <ol>/<li> for numbered lists
- Do NOT include <html>, <head>, <body>, or <style> tags - just the content HTML
- Use professional business language
- Be specific and actionable
- Include placeholders like [CLIENT NAME] or [SPECIFIC DATE] where appropriate for user to fill in`;

    // Gemini doesn't support native SSE streaming the same way, so we use generateContent
    // and stream the response back character by character for a smooth UX
    const aiResponse = await fetch(
      `${GEMINI_API_BASE}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("Failed to generate proposal");
    }

    const result = await aiResponse.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Stream back as SSE to match the client's streaming expectation
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Emit content as a single SSE chunk
        const payload = JSON.stringify({ choices: [{ delta: { content } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in generate-proposal function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
