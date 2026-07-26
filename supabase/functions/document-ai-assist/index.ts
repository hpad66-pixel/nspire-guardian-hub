// document-ai-assist (PR3l) — "Ask AI" inside the document editor: continue
// writing, rewrite a selection, or draft a new paragraph on request. Strictly
// user-triggered (a button click) — never auto-run. Returns plain text/HTML
// fragment to insert; the caller decides where.
// POST { projectName?, mode: 'continue'|'rewrite'|'custom', context, selection?, instruction? }
//   → { text, model }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_PROMPT = `You help write and edit a project document/letter for a consulting/engineering firm. You
are given the surrounding text for context and one of three requests:
  - "continue": write the next sentence(s)/paragraph that naturally follows the given context.
  - "rewrite": rewrite ONLY the given selection per the instruction (tone, clarity, length), preserving its meaning and any facts/figures.
  - "custom": follow the user's instruction to draft new content for this document (e.g. "add a closing paragraph", "add a paragraph about the meter reading").

Rules:
- Match the voice already present in the context: professional, precise, courteous.
- Never invent facts, dates, figures, or names not present in the context or instruction.
- Return ONLY the new/rewritten text as plain paragraphs (no markdown, no quotes, no preamble like "Here is...").
- Keep it as short as the request allows.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Not authenticated" }, 401);

    const { projectName, mode, context, selection, instruction, projectId } = await req.json();
    if (!["continue", "rewrite", "custom"].includes(mode)) return json({ error: "Invalid mode" }, 400);

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let system = DEFAULT_PROMPT, model = "claude-sonnet-4-6";
    try {
      const { data } = await admin.from("ai_skill_prompts").select("system_prompt, model, is_active").eq("skill_key", "document_ai_assist").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch { /* defaults */ }
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const parts: string[] = [];
    if (projectName) parts.push(`Document/project: ${projectName}`);
    parts.push(`Request: ${mode}`);
    parts.push(`\nCONTEXT (surrounding text):\n${String(context || "").slice(-4000) || "(document is empty so far)"}`);
    if (mode === "rewrite") parts.push(`\nSELECTION TO REWRITE:\n${String(selection || "")}`);
    if (instruction) parts.push(`\nINSTRUCTION:\n${instruction}`);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 800, system, messages: [{ role: "user", content: parts.join("\n") }] }),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
      console.error(`document-ai-assist ${model} ${r.status}:`, await r.text());
      return json({ error: "Couldn't generate that." }, 502);
    }
    const data = await r.json();
    await logAiUsage({ req, skill: "document_ai_assist", model, anthropicJson: data, projectId: projectId ?? null });
    const text = String(data.content?.[0]?.text ?? "").trim();
    return json({ text, model });
  } catch (e) {
    console.error("document-ai-assist error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
