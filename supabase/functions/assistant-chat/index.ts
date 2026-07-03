// Build OS financial assistant. Answers natural-language questions about ONE
// project's construction financials using a fixed set of CURATED, READ-ONLY tools
// (no arbitrary SQL). The Supabase client is created with the caller's JWT, so RLS
// scopes every read to the caller's tenant — the assistant can never see or change
// data the user can't. Claude drives an agentic tool loop; we execute the queries.
//
// Requires the ANTHROPIC_API_KEY edge-function secret (already used by
// draft-change-order). projectId + messages come from the client.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";
const APPROVED = ["executed", "approved"];
const n = (v: unknown) => Number(v) || 0;
const r2 = (x: number) => Math.round(x * 100) / 100;

const TOOLS = [
  { name: "get_financial_summary", description: "Overall position: revised contract value, billed-to-date, paid-to-date, retainage held, balance to finish, and % complete.", input_schema: { type: "object", properties: {} } },
  { name: "get_cash_position", description: "Money received from the owner vs paid out to subcontractors, and the net cash position.", input_schema: { type: "object", properties: {} } },
  { name: "list_pay_apps", description: "Pay applications with status, billed this period, retainage, and current amount due.", input_schema: { type: "object", properties: {} } },
  { name: "list_change_orders", description: "Prime change orders with amount and status.", input_schema: { type: "object", properties: { filter: { type: "string", enum: ["all", "approved", "pending"], description: "Approved = executed/approved; pending = everything else." } } } },
  { name: "list_commitments", description: "Subcontracts/commitments with committed, paid, and remaining amounts.", input_schema: { type: "object", properties: {} } },
  { name: "get_retainage_held", description: "Retainage currently held, from the latest pay application.", input_schema: { type: "object", properties: {} } },
  // ── Field tools (GC only) — ask about the actual project work, not just money ──
  { name: "list_rfis", description: "RFIs (requests for information) on this project with number, subject, status and due date.", input_schema: { type: "object", properties: { filter: { type: "string", enum: ["all", "open", "overdue"], description: "open = open/pending; overdue = open and past due." } } } },
  { name: "list_submittals", description: "Submittals with title, status and due date.", input_schema: { type: "object", properties: { filter: { type: "string", enum: ["all", "open"] } } } },
  { name: "list_punch", description: "Open punch-list items (defects/corrections still to be closed out).", input_schema: { type: "object", properties: {} } },
  { name: "recent_daily_reports", description: "The most recent daily field reports with date and work performed.", input_schema: { type: "object", properties: { limit: { type: "number", description: "How many recent reports, default 7." } } } },
  { name: "list_meetings", description: "Recent project meetings with title, date and status.", input_schema: { type: "object", properties: { limit: { type: "number" } } } },
];

// Owner/client audience: contract, billings, change orders, retainage ONLY.
// NEVER the contractor's cash position or subcontractor costs/margins.
const OWNER_SAFE = new Set(["get_financial_summary", "get_retainage_held", "list_pay_apps", "list_change_orders"]);

// Field tools query the DB on demand (RLS-scoped), independent of the financials.
const FIELD = new Set(["list_rfis", "list_submittals", "list_punch", "recent_daily_reports", "list_meetings"]);
const EMPTY_FIN: Fin = { contract: { original_value: 0, retainage_pct: 0 }, cos: [], payApps: [], primePayments: [], commitments: [], commitmentPayments: [] };
const today = () => new Date().toISOString().slice(0, 10);

/** Defensive field-tool runner: a missing table/column returns a note, never throws. */
async function runFieldTool(supa: SupabaseClient, projectId: string, name: string, input: any): Promise<unknown> {
  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn(); } catch { return fallback; } };
  switch (name) {
    case "list_rfis": {
      const rows = await safe(async () => (await supa.from("rfis").select("rfi_number, subject, status, due_date").eq("project_id", projectId)).data ?? [], [] as any[]);
      const f = input?.filter ?? "all";
      const open = (r: any) => r.status === "open" || r.status === "pending";
      const filtered = rows.filter((r: any) => f === "all" ? true : f === "overdue" ? (open(r) && r.due_date && r.due_date < today()) : open(r));
      return filtered.map((r: any) => ({ rfi: `RFI-${r.rfi_number}`, subject: r.subject, status: r.status, due: r.due_date ?? null }));
    }
    case "list_submittals": {
      const rows = await safe(async () => (await supa.from("submittals").select("title, status, due_date").eq("project_id", projectId)).data ?? [], [] as any[]);
      const f = input?.filter ?? "all";
      return rows.filter((s: any) => f === "all" ? true : s.status !== "approved" && s.status !== "closed").map((s: any) => ({ title: s.title, status: s.status, due: s.due_date ?? null }));
    }
    case "list_punch": {
      const rows = await safe(async () => (await supa.from("punch_items").select("title, status, trade, due_date").eq("project_id", projectId)).data ?? [], [] as any[]);
      return rows.filter((p: any) => p.status !== "closed" && p.status !== "verified" && p.status !== "completed").map((p: any) => ({ item: p.title, status: p.status, trade: p.trade ?? null, due: p.due_date ?? null }));
    }
    case "recent_daily_reports": {
      const lim = Math.min(Number(input?.limit) || 7, 20);
      const rows = await safe(async () => (await supa.from("daily_reports").select("report_date, work_performed").eq("project_id", projectId).order("report_date", { ascending: false }).limit(lim)).data ?? [], [] as any[]);
      return rows.map((d: any) => ({ date: d.report_date, work: typeof d.work_performed === "string" ? d.work_performed.slice(0, 400) : d.work_performed }));
    }
    case "list_meetings": {
      const lim = Math.min(Number(input?.limit) || 8, 20);
      const rows = await safe(async () => (await supa.from("project_meetings").select("title, meeting_date, status").eq("project_id", projectId).order("meeting_date", { ascending: false }).limit(lim)).data ?? [], [] as any[]);
      return rows.map((m: any) => ({ title: m.title, date: m.meeting_date, status: m.status }));
    }
    default:
      return { error: `Unknown field tool ${name}` };
  }
}

interface Fin {
  contract: { original_value: number; retainage_pct: number };
  cos: any[]; payApps: any[]; primePayments: any[]; commitments: any[]; commitmentPayments: any[];
}

async function gather(supa: SupabaseClient, projectId: string): Promise<Fin | null> {
  const { data: contract } = await supa.from("prime_contracts")
    .select("id, original_value, retainage_pct").eq("project_id", projectId).maybeSingle();
  if (!contract) return null;
  const [cos, payApps, primePayments, commitments] = await Promise.all([
    supa.from("change_orders").select("co_no, co_type, title, amount, status, commitment_id").eq("project_id", projectId),
    supa.from("prime_contract_pay_apps").select("pay_app_no, period_end, status, submitted_amount, approved_amount, pay_app_data").eq("prime_contract_id", contract.id),
    supa.from("prime_contract_payments").select("amount, received_date").eq("prime_contract_id", contract.id),
    supa.from("commitments").select("id, title, original_value").eq("project_id", projectId),
  ]);
  const cIds = (commitments.data ?? []).map((c: any) => c.id);
  const cPays = cIds.length
    ? await supa.from("commitment_payments").select("commitment_id, amount, paid_date").in("commitment_id", cIds)
    : { data: [] };
  return {
    contract: { original_value: n(contract.original_value), retainage_pct: n(contract.retainage_pct) },
    cos: cos.data ?? [], payApps: payApps.data ?? [], primePayments: primePayments.data ?? [],
    commitments: commitments.data ?? [], commitmentPayments: cPays.data ?? [],
  };
}

const latest = (f: Fin) => [...f.payApps].sort((a, b) => b.pay_app_no - a.pay_app_no)[0] ?? null;

function summary(f: Fin) {
  const approvedCo = r2(f.cos.filter((c) => c.co_type === "PCO" && APPROVED.includes(c.status)).reduce((s, c) => s + n(c.amount), 0));
  const revised = r2(f.contract.original_value + approvedCo);
  const last = latest(f);
  const billed = r2(n(last?.pay_app_data?.completed_stored_to_date) || n(last?.submitted_amount));
  const retainage = r2(n(last?.pay_app_data?.retainage_total));
  const paid = r2(f.primePayments.reduce((s, p) => s + n(p.amount), 0));
  return {
    original_contract: f.contract.original_value, approved_change_orders: approvedCo, revised_contract: revised,
    billed_to_date: billed, paid_to_date: paid, retainage_held: retainage, balance_to_finish: r2(revised - billed),
    percent_complete: revised > 0 ? r2((billed / revised) * 100) : 0, retainage_pct: f.contract.retainage_pct,
  };
}

function runTool(name: string, input: any, f: Fin, owner: boolean): unknown {
  if (owner && !OWNER_SAFE.has(name)) return { error: "That information isn't available in the client view." };
  switch (name) {
    case "get_financial_summary":
      return summary(f);
    case "get_retainage_held":
      return { retainage_held: summary(f).retainage_held, contract_retainage_pct: f.contract.retainage_pct };
    case "get_cash_position": {
      const inn = r2(f.primePayments.reduce((s, p) => s + n(p.amount), 0));
      const out = r2(f.commitmentPayments.reduce((s, p) => s + n(p.amount), 0));
      return { received_from_owner: inn, paid_to_subcontractors: out, net_position: r2(inn - out) };
    }
    case "list_pay_apps": {
      const sorted = [...f.payApps].sort((a, b) => a.pay_app_no - b.pay_app_no);
      let prev = 0;
      return sorted.map((p) => {
        const g = p.pay_app_data ?? {};
        const completed = r2(n(g.completed_stored_to_date) || n(p.submitted_amount));
        const row = {
          pay_app: p.pay_app_no, period_end: p.period_end, status: p.status,
          billed_this_period: r2(n(g.completed_stored_to_date) ? completed - prev : n(p.submitted_amount)),
          completed_to_date: completed, retainage: r2(n(g.retainage_total)),
          current_due: r2(n(g.current_payment_due) || n(p.approved_amount) || n(p.submitted_amount)),
        };
        prev = completed;
        return row;
      });
    }
    case "list_change_orders": {
      const filter = input?.filter ?? "all";
      return f.cos.filter((c) => c.co_type === "PCO")
        .filter((c) => filter === "all" || (filter === "approved" ? APPROVED.includes(c.status) : !APPROVED.includes(c.status)))
        .sort((a, b) => a.co_no - b.co_no)
        .map((c) => ({ co: `PCO-${String(c.co_no).padStart(3, "0")}`, title: c.title, amount: r2(n(c.amount)), status: c.status }));
    }
    case "list_commitments":
      return f.commitments.map((c) => {
        const cco = r2(f.cos.filter((x) => x.commitment_id === c.id && APPROVED.includes(x.status)).reduce((s, x) => s + n(x.amount), 0));
        const committed = r2(n(c.original_value) + cco);
        const paid = r2(f.commitmentPayments.filter((p) => p.commitment_id === c.id).reduce((s, p) => s + n(p.amount), 0));
        return { subcontract: c.title, committed, paid, remaining: r2(committed - paid) };
      });
    default:
      return { error: `Unknown tool ${name}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { projectId, messages, audience } = await req.json();
    if (!projectId) return json({ error: "projectId required" }, 400);
    if (!Array.isArray(messages) || !messages.length) return json({ error: "messages required" }, 400);
    const owner = audience === "owner";
    const tools = owner ? TOOLS.filter((t) => OWNER_SAFE.has(t.name)) : TOOLS;

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: project } = await supa.from("projects").select("name").eq("id", projectId).maybeSingle();
    const fin = (await gather(supa, projectId)) ?? EMPTY_FIN;

    const system = owner
      ? `You are the client assistant for the project "${project?.name ?? "this project"}", speaking to the OWNER/client.
Answer the owner's questions about THEIR contract using the provided tools. Rules:
- Scope: the contract value, approved/pending change orders, pay-application billings, amounts due, and retainage held.
- You do NOT have, and must NEVER discuss or estimate, the contractor's internal costs, subcontractor payments, vendor costs, or profit/margins. If asked, politely say that isn't part of the client view.
- Use tools for real numbers; NEVER invent figures. Be concise and specific with exact dollars and percentages.`
      : `You are the project assistant for the construction project "${project?.name ?? "this project"}". You can answer about the project's FINANCES and its FIELD work.
Answer using the provided tools. Rules:
- Use tools to get real data; NEVER invent or estimate figures or items the tools didn't return.
- Financial tools: contract summary, cash position, pay apps, change orders, commitments, retainage. Money in = owner→us (pay-app payments). Money out = us→subcontractors (commitment payments).
- Field tools: RFIs (list_rfis with filter open/overdue), submittals, open punch items, recent daily reports, and meetings. Use these for "what's overdue", "what happened this week", "any open RFIs", "status of the field", etc.
- Be concise and specific. Quote exact figures, RFI numbers, dates. Prefer a short sentence or a tight bullet list.
- If the tools genuinely don't cover something (drawings, specs, individual documents), say so briefly and point to the relevant app section.
- Today's date context comes from the data; don't guess dates.`;

    // Convert inbound {role, content:string} → Anthropic messages.
    const convo: any[] = messages.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "") }));

    let final = "";
    for (let i = 0; i < 6; i++) {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages: convo, tools }),
      });
      if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
      const data = await res.json();
      await logAiUsage({ req, skill: "assistant_chat", model: MODEL, anthropicJson: data, projectId });
      const blocks = data?.content ?? [];
      const toolUses = blocks.filter((b: any) => b.type === "tool_use");
      const text = blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();

      if (data.stop_reason === "tool_use" && toolUses.length) {
        convo.push({ role: "assistant", content: blocks });
        const results = await Promise.all(toolUses.map(async (t: any) => {
          const out = (!owner && FIELD.has(t.name))
            ? await runFieldTool(supa, projectId, t.name, t.input)
            : runTool(t.name, t.input, fin, owner);
          return { type: "tool_result", tool_use_id: t.id, content: JSON.stringify(out) };
        }));
        convo.push({ role: "user", content: results });
        continue;
      }
      final = text || "I'm not sure how to answer that from the financial data I can see.";
      break;
    }
    return json({ reply: final || "Sorry, I couldn't complete that. Try rephrasing." });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
