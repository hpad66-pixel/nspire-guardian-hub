import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "claude-haiku-4-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function localAnswer(question: string, snapshot: Record<string, unknown>) {
  const q = (question || "").toLowerCase();
  const kpis = (snapshot.kpis ?? {}) as Record<string, number>;
  const accounts = (snapshot.accounts ?? []) as Array<Record<string, unknown>>;
  if (/dispute|building 8|216|estimate/.test(q)) {
    return "Building 8 (acct 2745714336) is the formal dispute. Miami-Dade estimated ~216k gallons/month while the building was vacant. Ask for actual reads and a credit memo; do not treat those estimates as consumption.";
  }
  if (/ytd|year|spend|cost/.test(q)) {
    return `Year-to-date water/sewer spend is $${Number(kpis.ytdSpend || 0).toLocaleString()} across ${accounts.length} service accounts. Trailing-12 is $${Number(kpis.last12Spend || 0).toLocaleString()}.`;
  }
  if (/what should|next|action/.test(q)) {
    return "This week: (1) keep Building 8 on the dispute path with actual meter photos, (2) clear past-due before late fees, (3) ingest the newest PDFs so the executive brief stays live.";
  }
  return `Trailing-12 spend is $${Number(kpis.last12Spend || 0).toLocaleString()} across ${accounts.length} accounts. Ask about a building, estimates, or the next action.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const question = String(body.question || "").trim();
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const snapshot = (body.snapshot && typeof body.snapshot === "object") ? body.snapshot : {};
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const token = body.token ? String(body.token) : null;
    const propertyId = body.propertyId ? String(body.propertyId) : null;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (token) {
      const { data } = await service.rpc("water_intel_resolve_token", { p_token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.property_id) {
        return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    } else if (propertyId) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ answer: localAnswer(question, snapshot), source: "local" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const sys = `You are Water Intelligence, an executive briefing partner for APAS and the property owner.
Speak like a CFO + utility analyst. Be concise, specific, and actionable.
Never invent meter reads. Use only the JSON snapshot.
If Building 8 / account 2745714336 appears, treat estimated ~216k gal/mo during vacancy as a live dispute — recommend actual reads and a credit memo.
Always name the next action for the owner or consultant.
Snapshot:\n${JSON.stringify(snapshot).slice(0, 14000)}`;

    const messages = [
      ...history
        .filter((m: any) => m?.role === "user" || m?.role === "assistant")
        .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") })),
      { role: "user", content: question },
    ];

    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: sys,
        messages,
      }),
    });

    const json = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ answer: localAnswer(question, snapshot), source: "local" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const answer = (json.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n")
      .trim() || localAnswer(question, snapshot);

    await logAiUsage({ req, skill: "water_intel_chat", model: MODEL, anthropicJson: json, projectId: propertyId ?? undefined });

    return new Response(JSON.stringify({ answer, source: "claude" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
