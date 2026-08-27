// Turn a consultant's plain-language direction AND/OR an uploaded background
// document (a subconsultant quote, RFP, scope email, sketch, spreadsheet) into a
// structured financial-proposal draft — title, a client-addressed scope
// narrative, priced line items, and terms — that pre-fills the proposal builder
// for review. This is the proposal-side twin of draft-change-order.
//
// The background document is sent to Claude natively as a document/image content
// block (no lossy client-side text extraction). The project's client is fetched
// so the generated scope opens with the correct salutation and addressing — the
// author never types who it goes to.
//
// Uses the Anthropic (Claude) API with tool-use for guaranteed structured output.
// Requires the ANTHROPIC_API_KEY edge-function secret.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logAiUsage } from "../_shared/aiUsage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const DRAFT_TOOL = {
  name: "draft_financial_proposal",
  description: "Return the structured, client-ready financial-proposal draft written up from the direction and/or background document.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Concise one-line proposal title, no 'Proposal' prefix" },
      overview: {
        type: "string",
        description:
          "The proposal's opening narrative — 2-4 well-written paragraphs: our understanding of the client's need and objectives, and our overall approach. This is the heart of the write-up, in a confident professional consulting voice. Do NOT include a salutation or address block (the letter template renders those). Plain text with blank lines between paragraphs, no markdown.",
      },
      scope_bullets: {
        type: "array",
        description: "Scope of services — 3-8 specific bullet points describing exactly what work is included.",
        items: { type: "string" },
      },
      deliverables: {
        type: "array",
        description: "Deliverables — the concrete tangible outputs the client receives (reports, drawings, permits, submittals, etc.). 2-6 bullets.",
        items: { type: "string" },
      },
      terms: {
        type: "string",
        description: "Assumptions, exclusions, and commercial terms (payment, validity). Default to 'Net 30. All work per applicable codes and standards.' if nothing specific is provided.",
      },
      overhead_pct: { type: "number", description: "Overhead percentage to calculate from the cost-of-work subtotal; use the direction when stated, otherwise the provided default." },
      profit_pct: { type: "number", description: "Profit percentage to calculate from the cost-of-work subtotal; use the direction when stated, otherwise the provided default." },
      lines: {
        type: "array",
        description: "Priced fee line items broken out of the scope.",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["labor", "material", "equipment", "subcontract", "other"] },
            description: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string", description: "ls/hr/day/ea/lf/sf/cy/ton/mo" },
            unit_cost: { type: "number", description: "numeric dollars, no symbol" },
          },
          required: ["category", "description", "quantity", "unit", "unit_cost"],
        },
      },
    },
    required: ["title", "overview", "scope_bullets", "deliverables", "terms", "overhead_pct", "profit_pct", "lines"],
  },
};

const PDF_MEDIA = "application/pdf";
const IMAGE_MEDIA = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const { description, projectId, overheadPct, profitPct, document, documentName } = await req.json();

    const hasDoc = document && typeof document.data === "string" && document.data.length > 0;
    const hasDescription = description && String(description).trim().length >= 5;
    if (!hasDoc && !hasDescription) {
      return json({ error: "Attach a background document or describe the proposal first." }, 400);
    }
    if (hasDoc && !["pdf", "image", "text"].includes(document.kind)) {
      return json({ error: `Unsupported document kind: ${document.kind}` }, 400);
    }
    if (hasDoc && document.kind === "image" && !IMAGE_MEDIA.has(document.mediaType)) {
      return json({ error: `Unsupported image type: ${document.mediaType}` }, 400);
    }

    // Fetch the project + its client so the scope is addressed correctly.
    let projectName = "";
    let clientBlock = "";
    if (projectId) {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await supa
        .from("projects")
        .select("name, client:clients(name, contact_name, contact_email, address, city, state)")
        .eq("id", projectId)
        .maybeSingle();
      projectName = data?.name ?? "";
      const client = (data as { client?: {
        name?: string | null; contact_name?: string | null; contact_email?: string | null;
        address?: string | null; city?: string | null; state?: string | null;
      } | null } | null)?.client ?? null;
      if (client) {
        const addr = [client.address, [client.city, client.state].filter(Boolean).join(", ")].filter(Boolean).join(", ");
        clientBlock = [
          `Client / company: ${client.name ?? "N/A"}`,
          `Client contact: ${client.contact_name ?? "N/A"}`,
          `Client email: ${client.contact_email ?? "N/A"}`,
          `Client address: ${addr || "N/A"}`,
        ].join("\n");
      }
    }

    const docLabel = documentName ? `"${documentName}"` : "the attached document";
    const system = `You are a senior proposal writer for APAS Consulting. You turn a consultant's dictated story into a polished, client-ready proposal — the way a principal would write it up. The input is (a) a plain-language narrative and/or (b) an attached background document (subconsultant quote, RFP, scope email, spreadsheet, sketch).
Rules:
- WRITE IT UP BEAUTIFULLY. The 'overview' is the centerpiece: 2-4 confident, well-crafted paragraphs that show we understand the client's need and lay out our approach. Professional consulting voice, specific to this engagement, never generic boilerplate.
- Ground scope, quantities, and pricing in the BACKGROUND DOCUMENT when one is attached — pull real line items, units, quantities, and unit costs from it. Do not invent numbers the document or direction don't support.
- The dictated NARRATIVE governs emphasis, scope boundaries, and intent. When it conflicts with the document, follow the narrative.
- The proposal is addressed to the CLIENT provided below. The letter template renders the address block and salutation automatically — do NOT write a salutation or address block into any field.
- TITLE: concise one line, no "Proposal" prefix.
- OVERVIEW: the narrative body (understanding + approach). No salutation, no headings inside it.
- SCOPE_BULLETS: specific services included. DELIVERABLES: the tangible outputs the client receives.
- LINES: break the cost of work into priced items (category, description, quantity, unit, numeric unit_cost). If a subconsultant quote is attached, carry its cost as a 'subcontract' line. If only a lump sum is available, make one 'other' line, unit 'ls', quantity 1.
- OVERHEAD AND PROFIT: return overhead_pct and profit_pct separately. They are calculated percentages of the full cost-of-work subtotal, exactly like a change order. Never create overhead, profit, fee, or markup line items.
- Never use em dashes. Always call the draft_financial_proposal tool.`;

    const promptLines = [
      `Project: ${projectName || "consulting engagement"}`,
      `Default overhead %: ${overheadPct ?? 10}`,
      `Default profit %: ${profitPct ?? 5}`,
    ];
    if (clientBlock) promptLines.push(`\nClient this proposal is addressed to:\n${clientBlock}`);
    if (hasDoc) promptLines.push(`\nA background document (${docLabel}) is attached. Extract concrete scope, quantities, and unit costs from it.`);
    promptLines.push(
      hasDescription
        ? `\nConsultant's direction:\n${description}`
        : `\nNo additional written direction was provided — base the draft on the attached document.`,
    );
    const prompt = promptLines.join("\n");

    const content: unknown[] = [];
    if (hasDoc) {
      if (document.kind === "pdf") {
        content.push({ type: "document", source: { type: "base64", media_type: PDF_MEDIA, data: document.data }, title: documentName ?? undefined });
      } else if (document.kind === "image") {
        content.push({ type: "image", source: { type: "base64", media_type: document.mediaType, data: document.data } });
      } else if (document.kind === "text") {
        content.push({ type: "document", source: { type: "text", media_type: "text/plain", data: document.data }, title: documentName ?? undefined });
      }
    }
    content.push({ type: "text", text: prompt });

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content }],
        tools: [DRAFT_TOOL],
        tool_choice: { type: "tool", name: "draft_financial_proposal" },
      }),
    });

    if (!res.ok) return json({ error: `AI error: ${await res.text()}` }, 502);
    const data = await res.json();
    await logAiUsage({ req, skill: "financial_proposal_draft", model: MODEL, anthropicJson: data, projectId });
    const toolUse = (data?.content ?? []).find((c: { type?: string }) => c.type === "tool_use");
    if (!toolUse?.input) return json({ error: "No draft returned" }, 502);
    return json({ draft: toolUse.input });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
