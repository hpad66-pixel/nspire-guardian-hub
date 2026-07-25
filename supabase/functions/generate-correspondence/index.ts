// Draft a project correspondence letter/email body from a few inputs.
// POST { projectName, category, recipient, subject, context, priorThread?, glossary? }
//   → { body, model }
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

const CATEGORY_GUIDANCE: Record<string, string> = {
  r4: "a professional letter to the project owner/client — clear, businesslike, keeps the relationship strong; state facts, decisions, requests, and next steps plainly.",
  city: "a formal letter to a municipal/agency authority (e.g. a city) — professional, factual, cooperative; reference permits, submittals, or requirements only if given.",
  transmittal: "a short transmittal conveying attached deliverables (reports, drawings, submittals).",
  general: "a professional project correspondence letter.",
};

const DEFAULT_PROMPT = `You draft professional project correspondence for a consulting engineering firm (APAS) — letters to
owners/clients and to municipal agencies on active engagements.
Write the LETTER BODY only — no letterhead, no address block, no date, no "Dear ..." salutation or sign-off
(the document template adds those). Return clean paragraphs.

Voice: professional, precise, courteous. State facts, decisions, requests, and next steps clearly. Cite specific
dates, reference numbers, and figures only if they appear in the context or prior thread — never invent them.
Keep it as short as the substance allows.

Return ONLY the letter body text (plain paragraphs, blank line between paragraphs). No JSON, no markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { projectName, category, recipient, subject, context, priorThread, glossary } = await req.json();
    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts").select("system_prompt, model, is_active").eq("skill_key", "correspondence_draft").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const gl: Array<{ term: string }> = Array.isArray(glossary) ? glossary : [];
    const parts: string[] = [];
    parts.push(`This is ${CATEGORY_GUIDANCE[category] ?? CATEGORY_GUIDANCE.general}`);
    if (projectName) parts.push(`Engagement / project: ${projectName}`);
    if (recipient) parts.push(`Addressed to: ${recipient}`);
    if (subject) parts.push(`Subject: ${subject}`);
    if (typeof priorThread === "string" && priorThread.trim()) {
      parts.push(`\nPRIOR EMAIL THREAD (for context — do not quote verbatim):\n${priorThread.slice(0, 6000)}`);
    }
    if (gl.length) parts.push(`\nGLOSSARY (use these spellings):\n${gl.map((g) => `- ${g.term}`).join("\n")}`);
    parts.push(`\nContext / points to cover:\n${context || "(none provided — draft a clear, professional letter from the subject.)"}`);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: "user", content: parts.join("\n") }] }),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
      console.error(`generate-correspondence ${model} ${r.status}:`, await r.text());
      return json({ error: "Could not draft the letter." }, 502);
    }
    const data = await r.json();
    await logAiUsage({ req, skill: "correspondence_draft", model, anthropicJson: data, projectId: null });
    const body = String(data.content?.[0]?.text ?? "").trim();
    return json({ body, model });
  } catch (e) {
    console.error("generate-correspondence error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
