import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { STYLE_RULES } from "../_shared/ai-style-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

interface UploadedImage { media_type: string; data: string }

interface GenerateProposalRequest {
  projectId: string;
  proposalType: string;
  templateId?: string;
  userNotes?: string;
  subject?: string;
  fileContext?: string;       // extracted text from uploaded files
  images?: UploadedImage[];   // base64 images for multimodal context
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: GenerateProposalRequest = await req.json();
    const { projectId, proposalType, templateId, userNotes, subject, fileContext, images } = body;

    if (!projectId || !proposalType) {
      return new Response(JSON.stringify({ error: "Missing required fields: projectId and proposalType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`*, property:properties(name, address, city, state)`)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Template is optional now — generation works from narrative + files alone.
    let template: { prompt_template?: string } | null = null;
    if (templateId) {
      const { data } = await supabase.from("proposal_templates").select("*").eq("id", templateId).single();
      template = data;
    } else {
      const { data } = await supabase
        .from("proposal_templates").select("*")
        .eq("proposal_type", proposalType).eq("is_default", true).maybeSingle();
      template = data;
    }

    const formatBudget = (budget: number | null) =>
      budget
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(budget)
        : "TBD";

    const fill = (s: string) => s
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

    const promptParts: string[] = [];
    promptParts.push(`Document type: ${proposalType.replace(/_/g, " ")}.`);
    if (subject) promptParts.push(`Subject: ${subject}.`);
    promptParts.push(`Project: ${project.name}. Property: ${project.property?.name ?? "N/A"}. Budget: ${formatBudget(project.budget)}.`);
    if (project.scope) promptParts.push(`Project scope on file: ${project.scope}`);
    if (template?.prompt_template) promptParts.push(`Template guidance:\n${fill(template.prompt_template)}`);
    if (userNotes) promptParts.push(`What the author wants in this document (their dictation/notes):\n${userNotes}`);
    if (fileContext) promptParts.push(`Content extracted from the author's uploaded files (use as source material):\n${fileContext.slice(0, 60000)}`);
    if (images?.length) promptParts.push(`The author also attached ${images.length} image(s); read them for relevant details.`);

    const systemPrompt = `You are a senior proposal writer for APAS, a construction and property management firm. Produce a polished, client-ready document.

OUTPUT FORMAT:
- Return clean HTML for a rich text editor. Use <h2> for sections, <h3> for subsections, <p>, <ul>/<li>, <ol>/<li>.
- Do NOT include <html>, <head>, <body>, or <style> tags.
- Where the document includes pricing or a priced scope, render a table with this exact shape:
  <table class="proposal-pricing"><caption>Shaded rows alternate for readability so each line item is easy to track across the row.</caption><thead><tr><th>Item</th><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Unit Price</th><th class="num">Extended</th></tr></thead><tbody>...rows...</tbody><tfoot><tr><td colspan="5">Total</td><td class="num">$0.00</td></tr></tfoot></table>
  Put numeric cells in <td class="num">. Include markup as its own line item when relevant. Every amount carries its currency symbol. Always include the <caption> explaining the alternating row shading.

${STYLE_RULES}

Use [CLIENT NAME] or [DATE] placeholders only where a real value is genuinely unknown.`;

    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: promptParts.join("\n\n") }];
    for (const img of images ?? []) {
      userContent.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
    }

    const aiResponse = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!aiResponse.ok || !aiResponse.body) {
      const errorText = await aiResponse.text().catch(() => "");
      console.error("Anthropic API error:", aiResponse.status, errorText);
      const status = aiResponse.status === 429 ? 429 : 500;
      return new Response(
        JSON.stringify({ error: status === 429 ? "Rate limit exceeded. Please try again later." : "Failed to generate proposal" }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Transform Anthropic's SSE into the {choices:[{delta:{content}}]} envelope the client expects.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = aiResponse.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const evt = JSON.parse(payload);
                if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                  const out = JSON.stringify({ choices: [{ delta: { content: evt.delta.text } }] });
                  controller.enqueue(encoder.encode(`data: ${out}\n\n`));
                }
              } catch { /* skip partial */ }
            }
          }
        } catch (e) {
          console.error("stream error", e);
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in generate-proposal function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
