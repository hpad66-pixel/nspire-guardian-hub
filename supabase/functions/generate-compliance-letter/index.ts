// Draft a formal regulatory / agency letter body from a few inputs.
// POST { projectName, letterType, agency, recipient, subject, context, glossary? }
//   → { body }
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

const TYPE_GUIDANCE: Record<string, string> = {
  regulatory_notice: "a formal regulatory notice to a regulated party stating a requirement or finding.",
  response: "a response to an agency notice, request, or notice of violation — professional, factual, non-admitting.",
  transmittal: "a short transmittal letter conveying attached deliverables (reports, DMRs, plans).",
  request: "a request to the agency (extension, meeting, clarification, variance).",
  general: "a professional environmental-compliance letter.",
};

const DEFAULT_PROMPT = `You draft formal environmental regulatory correspondence for a consulting engineering firm.
Write the LETTER BODY only — no letterhead, no address block, no date, no "Dear ..." salutation or sign-off
(the document template adds those). Return clean paragraphs.

Voice: professional, precise, and measured. Cite specific facts, permit numbers, dates, and regulatory
citations only if they appear in the context — never invent them. For responses to agencies, be factual and
cooperative without admitting liability. Keep it as short as the substance allows.

Return ONLY the letter body text (plain paragraphs, blank line between paragraphs). No JSON, no markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { projectName, letterType, agency, recipient, subject, context, glossary } = await req.json();
    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts").select("system_prompt, model, is_active").eq("skill_key", "compliance_letter").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const gl: Array<{ term: string; variants: string[] }> = Array.isArray(glossary) ? glossary : [];
    const parts: string[] = [];
    parts.push(`This is ${TYPE_GUIDANCE[letterType] ?? TYPE_GUIDANCE.general}`);
    if (projectName) parts.push(`Engagement / site: ${projectName}`);
    if (agency) parts.push(`Recipient agency: ${agency}`);
    if (recipient) parts.push(`Addressed to: ${recipient}`);
    if (subject) parts.push(`Subject: ${subject}`);
    if (gl.length) parts.push(`\nGLOSSARY (use these spellings):\n${gl.map((g) => `- ${g.term}`).join("\n")}`);
    parts.push(`\nContext / points to cover:\n${context || "(none provided — draft a clear, professional letter from the subject.)"}`);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: "user", content: parts.join("\n") }] }),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
      console.error(`generate-compliance-letter ${model} ${r.status}:`, await r.text());
      return json({ error: "Could not draft the letter." }, 502);
    }
    const data = await r.json();
    await logAiUsage({ req, skill: "compliance_letter", model, anthropicJson: data, projectId: null });
    const body = String(data.content?.[0]?.text ?? "").trim();
    return json({ body, model });
  } catch (e) {
    console.error("generate-compliance-letter error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
