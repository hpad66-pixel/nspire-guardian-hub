// Project Log AI — two actions, both authenticated (the GC's app passes the JWT):
//   summarize: turn the log into a client-ready progress update.
//   ingest:    parse an Otter/voice transcript into proposed item updates the app
//              shows for review, then applies via the normal (RLS-respecting) hooks.
// The app passes the items in the body, so this function never touches the DB.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function claude(system: string, user: string, key: string, maxTokens = 2048): Promise<string> {
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) {
    if (r.status === 429) throw new Error("Rate limit exceeded. Try again in a moment.");
    throw new Error(`Anthropic API error: ${r.status}`);
  }
  const data = await r.json();
  await logAiUsage({ skill: "tracker_ai", model: MODEL, anthropicJson: data, projectId: null });
  let text: string = data.content?.[0]?.text ?? "";
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fence) text = fence[1].trim();
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
    const body = await req.json();
    const action = body.action as string;

    if (action === "summarize") {
      const items = (body.items ?? []) as any[];
      const projectName = body.project_name || "the project";
      const system = `You are a senior construction / program manager writing a concise, professional progress update FOR THE CLIENT/OWNER. Warm but businesslike. No fluff, no invented facts — use only what the items say.

LEAD WITH WHAT NEEDS A DECISION. Each item may carry a RAG signal:
- "OVERDUE" (past its due date) and "AT-RISK" (blocked) are CRITICAL — call these out FIRST, by name, and say plainly what is needed to unblock them or who owns them.
- "DUE-SOON" items are worth a heads-up.
- Then summarize progress (done / in progress) briefly.

Structure as short HTML: a 1-2 sentence headline that states overall status AND flags whether anything needs the client's attention. Then bullets — put the critical / overdue / at-risk items at the TOP of the bullet list (you may bold "Action needed:" on those), followed by progress. If items carry tags (e.g. MS4, illicit discharge, lead & copper, consent decree, commission), mention them by program area where it helps the client. Note how long a critical item has been open when given ("open Nd"). Keep under ~200 words. Respond with JSON only, no fences: {"title":"string","summary_html":"string"}`;
      const user = `Project: ${projectName}\n\nLOG ITEMS (rag · status · owner · age · tags · title · (due) · latest note):\n${items.map((i) => {
        const bits = [
          i.rag ? String(i.rag).toUpperCase() : null,
          `[${i.status}]`,
          i.owner || null,
          (i.age_days != null) ? `open ${i.age_days}d` : null,
          (i.tags && i.tags.length) ? `#${i.tags.join(" #")}` : null,
        ].filter(Boolean).join(" · ");
        return `- ${bits} :: ${i.title}${i.due ? ` (due ${i.due})` : ""}${i.latest ? ` — ${i.latest}` : ""}`;
      }).join("\n")}`;
      const parsed = JSON.parse(await claude(system, user, key, 1600));
      return json({ ok: true, title: parsed.title ?? "Project update", summary_html: parsed.summary_html ?? "" });
    }

    if (action === "ingest") {
      const transcript = String(body.transcript ?? "").trim();
      if (!transcript) return json({ error: "Transcript is required" }, 400);
      const items = (body.items ?? []) as any[];
      const system = `You convert a contractor's spoken/Otter meeting transcript into UPDATES for an existing project log. You are given the current items (id, code, owner, title, status). For each piece of progress mentioned, decide whether it maps to an existing item (use its id) or is genuinely NEW.
Return JSON only, no fences:
{"changes":[{"item_id":"existing id or null","code":"existing code or suggested for new","owner":"string or null","title":"existing title or new short title","note":"the timestamped update note in clean professional language","new_status":"open|progress|scheduled|blocked|done or null","is_new":true|false}]}
Rules: match to an existing item whenever the transcript clearly refers to it. Only set is_new=true when nothing matches. note is required and must be a clear professional sentence (not the raw speech). Set new_status only when the transcript implies a status change. Do not duplicate. Skip chit-chat with no actionable progress.`;
      const user = `CURRENT ITEMS:\n${items.map((i) =>
        `- id=${i.id} code=${i.code ?? ""} [${i.status}] owner=${i.owner ?? ""} :: ${i.title}`).join("\n")}\n\nTRANSCRIPT:\n${transcript}`;
      const parsed = JSON.parse(await claude(system, user, key, 4096));
      return json({ ok: true, changes: Array.isArray(parsed.changes) ? parsed.changes : [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
