// AI portfolio briefing: turn aggregated cross-project + per-person stats into a
// concise "state of the portfolio" for a PM/exec — health summary, top risks,
// recommendations, and a read on how the team is doing.
// POST { portfolio, people } -> { summary, topRisks[], recommendations[], peopleInsights[] }
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

const DEFAULT_PROMPT = `You are the chief of staff for a construction + consulting firm, briefing a busy principal.
You are given aggregated stats for every active project and every team member. Produce a crisp, actionable
briefing — no fluff, specific to the numbers.

Return ONLY valid JSON in exactly this shape:
{
  "summary": "2-3 sentences on overall portfolio health — what's good, what's slipping.",
  "topRisks": [{"project":"name","title":"short risk","severity":"high|medium|low","action":"the one next move"}],
  "recommendations": ["specific action the principal or a PM should take this week"],
  "peopleInsights": [{"name":"person","note":"one-line read: overloaded / crushing it / slipping / needs help"}]
}

Rules:
- Rank topRisks most urgent first; at most 6. Base severity on overdue items, budget overruns, and flags.
- Call out anyone clearly overloaded (high open + overdue) OR clearly excelling (high completed + on-time).
- Be concrete: name the project/person and the number. No generic advice.
- If the portfolio is healthy, say so briefly rather than inventing problems.`;

async function callClaude(key: string, model: string, system: string, user: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: "user", content: user }] }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { portfolio, people } = await req.json();
    const projects = Array.isArray(portfolio?.projects) ? portfolio.projects : [];
    const ppl = Array.isArray(people) ? people : [];
    if (!projects.length && !ppl.length) return json({ error: "Nothing to brief on yet." }, 400);

    let system = DEFAULT_PROMPT;
    let model = "claude-sonnet-4-6";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data } = await admin.from("ai_skill_prompts")
        .select("system_prompt, model, is_active").eq("skill_key", "portfolio_briefing").eq("is_active", true).maybeSingle();
      if (data?.system_prompt) system = data.system_prompt;
      if (data?.model) model = data.model;
    } catch (_) { /* non-fatal */ }
    if (!model.startsWith("claude")) model = "claude-sonnet-4-6";

    const t = portfolio?.totals ?? {};
    const lines: string[] = [];
    lines.push(`PORTFOLIO: ${t.projects ?? projects.length} active (${t.construction ?? "?"} construction, ${t.consulting ?? "?"} consulting). ` +
      `Contract value $${Math.round(t.contractValue ?? 0).toLocaleString()}, billed $${Math.round(t.billed ?? 0).toLocaleString()}. ` +
      `${t.atRisk ?? 0} red, ${t.watch ?? 0} amber, ${t.healthy ?? 0} green. ${t.overdueItems ?? 0} overdue action items across ${t.openItems ?? 0} open.`);
    lines.push(`\nPROJECTS:`);
    for (const p of projects.slice(0, 60)) {
      lines.push(`- ${p.name} [${p.kind ?? "?"}, ${p.status ?? "?"}, ${p.rag ?? "?"}] budget $${Math.round(p.revisedBudget ?? 0).toLocaleString()}, billed $${Math.round(p.billed ?? 0).toLocaleString()}, ${p.openItems ?? 0} open / ${p.overdueItems ?? 0} overdue.` +
        (Array.isArray(p.flags) && p.flags.length ? ` Flags: ${p.flags.join(", ")}.` : ""));
    }
    if (ppl.length) {
      lines.push(`\nTEAM:`);
      for (const m of ppl.slice(0, 40)) {
        lines.push(`- ${m.name}: ${m.open ?? 0} open, ${m.overdue ?? 0} overdue, ${m.completed ?? 0} completed${m.onTimePct != null ? `, ${m.onTimePct}% on-time` : ""}.`);
      }
    }

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic) return json({ error: "AI service is not configured." }, 500);

    const r = await callClaude(anthropic, model, system, lines.join("\n"));
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
      console.error(`portfolio-briefing Claude ${model} ${r.status}:`, await r.text());
      return json({ error: "Could not generate the briefing." }, 502);
    }
    const data = await r.json();
    await logAiUsage({ req, skill: "portfolio_briefing", model, anthropicJson: data, projectId: null });
    try {
      const raw = data.content?.[0]?.text ?? "";
      const f = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
      const parsed = JSON.parse((f ? f[1] : raw).trim());
      const arr = (v: unknown) => (Array.isArray(v) ? v : []);
      return json({
        summary: String(parsed?.summary ?? "").trim(),
        topRisks: arr(parsed?.topRisks).slice(0, 6),
        recommendations: arr(parsed?.recommendations).map((s: unknown) => String(s)).slice(0, 8),
        peopleInsights: arr(parsed?.peopleInsights).slice(0, 20),
        model,
      });
    } catch (e) {
      console.error("portfolio-briefing parse error:", e);
      return json({ error: "Could not parse the briefing." }, 502);
    }
  } catch (e) {
    console.error("portfolio-briefing error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
