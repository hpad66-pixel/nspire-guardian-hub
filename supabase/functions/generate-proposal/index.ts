import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      console.error("Missing or invalid authorization header");
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
      console.error("Auth validation failed:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log("Authenticated user:", userId);

    const body: GenerateProposalRequest = await req.json();
    const { projectId, proposalType, templateId, userNotes, subject } = body;

    if (!projectId || !proposalType) {
      return new Response(JSON.stringify({ error: "Missing required fields: projectId and proposalType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating proposal for project:", projectId, "type:", proposalType);

    // Fetch project details with property
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`*, property:properties(name, address, city, state)`)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectError);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template
    let template;
    if (templateId) {
      const { data } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("id", templateId)
        .single();
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
      console.error("Template not found for type:", proposalType);
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Using template:", template.name);

    // Build prompt with project context
    const formatBudget = (budget: number | null) => {
      if (!budget) return "TBD";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(budget);
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

    console.log("Generated prompt length:", prompt.length);

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional business consultant and proposal writer with expertise in construction, property management, and project management.

Generate clear, professional, and persuasive business documents.

IMPORTANT FORMATTING RULES:
- Output in clean HTML format suitable for a rich text editor
- Use semantic HTML tags: <h2> for main sections, <h3> for subsections, <p> for paragraphs, <ul>/<li> for bullet lists, <ol>/<li> for numbered lists
- Do NOT include <html>, <head>, <body>, or <style> tags - just the content HTML
- Use professional business language
- Be specific and actionable
- Include placeholders like [CLIENT NAME] or [SPECIFIC DATE] where appropriate for user to fill in`,
          },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error("Failed to generate proposal");
    }

    console.log("AI response received, streaming back to client");

    // Stream response back
    return new Response(aiResponse.body, {
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
