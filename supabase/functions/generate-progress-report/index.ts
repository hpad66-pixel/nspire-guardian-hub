import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GenerateReportRequest {
  projectId: string;
  reportType: "weekly" | "monthly_invoice";
  periodStart: string;
  periodEnd: string;
  userNotes?: string;
}

const fmt = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
    : "N/A";

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const body: GenerateReportRequest = await req.json();
    const { projectId, reportType, periodStart, periodEnd, userNotes } = body;

    if (!projectId || !reportType || !periodStart || !periodEnd) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Batch-fetch all project data in parallel ──────────────────────────────
    const [
      projectRes,
      milestonesRes,
      dailyReportsRes,
      changeOrdersRes,
      rfisRes,
      punchItemsRes,
      safetyRes,
      progressRes,
      commsRes,
      meetingsRes,
      brandingRes,
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("*, property:properties(name, address, city, state), client:clients(name, contact_name, contact_email)")
        .eq("id", projectId)
        .single(),
      supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date"),
      supabase
        .from("daily_reports")
        .select("*")
        .eq("project_id", projectId)
        .gte("report_date", periodStart)
        .lte("report_date", periodEnd)
        .order("report_date", { ascending: false }),
      supabase
        .from("change_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_rfis")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("punch_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_safety_incidents")
        .select("*")
        .eq("project_id", projectId)
        .gte("incident_date", periodStart)
        .lte("incident_date", periodEnd)
        .order("incident_date", { ascending: false }),
      supabase
        .from("project_progress_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("entry_date", { ascending: false })
        .limit(10),
      supabase
        .from("project_communications")
        .select("*")
        .eq("project_id", projectId)
        .gte("communication_date", periodStart)
        .lte("communication_date", periodEnd)
        .order("communication_date", { ascending: false }),
      supabase
        .from("project_meetings")
        .select("*")
        .eq("project_id", projectId)
        .gte("meeting_date", periodStart)
        .lte("meeting_date", periodEnd)
        .order("meeting_date", { ascending: false }),
      supabase
        .from("company_branding")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle(),
    ]);

    const project = projectRes.data;
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const milestones = milestonesRes.data || [];
    const dailyReports = dailyReportsRes.data || [];
    const changeOrders = changeOrdersRes.data || [];
    const rfis = rfisRes.data || [];
    const punchItems = punchItemsRes.data || [];
    const safetyIncidents = safetyRes.data || [];
    const progressEntries = progressRes.data || [];
    const communications = commsRes.data || [];
    const meetings = meetingsRes.data || [];
    const branding = brandingRes.data;

    const companyName = branding?.company_name || "APAS Consulting";
    const companyPhone = branding?.phone || "";
    const companyEmail = branding?.email || "";
    const companyAddress = [branding?.address_line1, branding?.address_line2].filter(Boolean).join(", ") || "";

    // ── Build the data context block ──────────────────────────────────────────
    const budget = Number(project.budget) || 0;
    const spent = Number(project.spent) || 0;
    const approvedCOs = changeOrders.filter((co: any) => co.status === "approved");
    const pendingCOs = changeOrders.filter((co: any) => co.status === "pending");
    const approvedCOAmount = approvedCOs.reduce((s: number, co: any) => s + (Number(co.amount) || 0), 0);
    const adjustedBudget = budget + approvedCOAmount;
    const spentPct = adjustedBudget > 0 ? ((spent / adjustedBudget) * 100).toFixed(1) : "0";
    const completedMilestones = milestones.filter((m: any) => m.status === "completed");
    const pendingMilestones = milestones.filter((m: any) => m.status !== "completed");
    const openRFIs = rfis.filter((r: any) => r.status === "open" || r.status === "submitted");
    const openPunch = punchItems.filter((p: any) => p.status === "open" || p.status === "in_progress");
    const closedPunch = punchItems.filter((p: any) => p.status === "completed" || p.status === "closed");
    const latestProgress = progressEntries[0];

    // EVM metrics
    const cpi = latestProgress?.cpi ?? null;
    const spi = latestProgress?.spi ?? null;
    const earnedValue = latestProgress?.earned_value ?? null;
    const plannedValue = latestProgress?.planned_value ?? null;

    const dailyLogsSummary = dailyReports
      .slice(0, 10)
      .map((r: any) => `  • ${r.report_date}: ${(r.work_performed || "").substring(0, 200)}${r.workers_count ? ` [${r.workers_count} workers]` : ""}${r.weather ? ` [${r.weather}]` : ""}`)
      .join("\n");

    const milestonesSummary = [
      ...completedMilestones.map((m: any) => `  ✓ COMPLETED: ${m.title}${m.completed_at ? ` (${fmtDate(m.completed_at)})` : ""}`),
      ...pendingMilestones.map((m: any) => `  ○ PENDING: ${m.title} — Due ${fmtDate(m.due_date)}${m.status === "at_risk" ? " ⚠️ AT RISK" : ""}`),
    ].join("\n");

    const rfiSummary = rfis
      .slice(0, 8)
      .map((r: any) => `  • [${r.status?.toUpperCase()}] ${r.subject || r.title || "RFI"}: ${(r.question || r.description || "").substring(0, 150)}`)
      .join("\n");

    const punchSummary = punchItems
      .slice(0, 10)
      .map((p: any) => `  • [${p.status?.toUpperCase()}] ${p.title}: ${(p.description || "").substring(0, 120)}${p.assignee_name ? ` — Assigned: ${p.assignee_name}` : ""}`)
      .join("\n");

    const safetySummary = safetyIncidents.length > 0
      ? safetyIncidents.map((s: any) => `  • ${s.incident_date}: [${s.incident_type}] ${(s.description || "").substring(0, 200)}`).join("\n")
      : "  No incidents recorded in this period.";

    const commsSummary = communications
      .slice(0, 8)
      .map((c: any) => `  • ${c.communication_date}: [${c.communication_type}] ${(c.summary || c.notes || "").substring(0, 200)}`)
      .join("\n");

    const meetingsSummary = meetings
      .slice(0, 5)
      .map((m: any) => `  • ${m.meeting_date}: ${m.title} — ${(m.objective || "").substring(0, 200)}`)
      .join("\n");

    const coSummary = changeOrders
      .slice(0, 8)
      .map((co: any) => `  • [${co.status?.toUpperCase()}] ${co.title}: ${fmt(co.amount)}${co.description ? ` — ${co.description.substring(0, 100)}` : ""}`)
      .join("\n");

    // ── Build type-specific prompts ───────────────────────────────────────────
    const sharedContext = `
PROJECT DATA CONTEXT
====================
Company: ${companyName}
Project Name: ${project.name}
Property/Location: ${project.property?.name || "N/A"}${project.property?.city ? `, ${project.property.city}` : ""}
Client: ${project.client?.name || "N/A"}${project.client?.contact_name ? ` (${project.client.contact_name})` : ""}
Project Status: ${project.status?.toUpperCase()}
Period: ${fmtDate(periodStart)} — ${fmtDate(periodEnd)}
Description: ${project.description || "N/A"}
Scope: ${project.scope || "N/A"}

FINANCIAL SUMMARY
-----------------
Original Contract Value: ${fmt(budget)}
Approved Change Orders: ${fmt(approvedCOAmount)} (${approvedCOs.length} COs)
Adjusted Contract Value: ${fmt(adjustedBudget)}
Spent to Date: ${fmt(spent)} (${spentPct}% of adjusted budget)
${earnedValue ? `Earned Value: ${fmt(earnedValue)}` : ""}
${plannedValue ? `Planned Value: ${fmt(plannedValue)}` : ""}
${cpi ? `Cost Performance Index (CPI): ${Number(cpi).toFixed(2)}` : ""}
${spi ? `Schedule Performance Index (SPI): ${Number(spi).toFixed(2)}` : ""}

SCHEDULE & MILESTONES (${milestones.length} total)
---------------------------------------------------
${milestonesSummary || "  No milestones recorded."}

DAILY LOGS IN PERIOD (${dailyReports.length} logs)
---------------------------------------------------
${dailyLogsSummary || "  No daily logs in this period."}

CHANGE ORDERS (${changeOrders.length} total — ${pendingCOs.length} pending)
---------------------------------------------------------------------------
${coSummary || "  No change orders."}

RFIs (${rfis.length} total — ${openRFIs.length} open)
------------------------------------------------------
${rfiSummary || "  No RFIs."}

PUNCH LIST (${punchItems.length} total — ${openPunch.length} open, ${closedPunch.length} closed)
-------------------------------------------------------------------------------------------------
${punchSummary || "  No punch list items."}

SAFETY INCIDENTS IN PERIOD
---------------------------
${safetySummary}

COMMUNICATIONS IN PERIOD (${communications.length} entries)
------------------------------------------------------------
${commsSummary || "  No communications logged."}

MEETINGS IN PERIOD (${meetings.length} meetings)
-------------------------------------------------
${meetingsSummary || "  No meetings in this period."}

USER CONTEXT/NOTES
------------------
${userNotes || "No additional notes provided."}
`;

    let systemPrompt = "";
    let userPrompt = "";

    if (reportType === "weekly") {
      systemPrompt = `You are a senior project management consultant with 30+ years of experience preparing executive-level progress reports. Your writing is precise, professional, and actionable.

Generate a WEEKLY PROGRESS SUMMARY report in clean HTML. This report is for internal teams and stakeholders to maintain accountability.

STRICT HTML FORMATTING RULES:
- Use ONLY these tags: <h2>, <h3>, <h4>, <p>, <ul>, <ol>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <em>, <span>
- Do NOT include <html>, <head>, <body>, <style>, or <script> tags
- Tables must have proper thead/tbody structure
- Be precise with numbers — use the actual data provided
- Write in authoritative, executive tone
- Each section must add real analytical value, not just restate data`;

      userPrompt = `Using the project data below, generate a professional WEEKLY PROGRESS SUMMARY for the period ${fmtDate(periodStart)} to ${fmtDate(periodEnd)}.

The report MUST include ALL of these sections in order:

<h2>1. Executive Summary</h2>
A 3–4 sentence high-level narrative of the week: what was accomplished, overall schedule/budget health, and one key highlight.

<h2>2. Work Completed This Week</h2>
Detailed bulleted summary from daily logs. Group by trade or work area where possible. Be specific — do not use vague language.

<h2>3. Milestone Status</h2>
HTML table with columns: Milestone | Status | Due Date | Notes/Risk. Use ✓ for completed, ○ for pending, ⚠ for at risk.

<h2>4. Schedule Performance</h2>
Analysis of schedule adherence. Are milestones on track? Any delays or accelerations? SPI analysis if data available.

<h2>5. Financial Performance</h2>
Budget vs. actual with CPI analysis. Change orders summary. Burn rate commentary.

<h2>6. RFIs & Submittals</h2>
Status of open RFIs with any blocking issues called out explicitly.

<h2>7. Punch List & Quality</h2>
Open vs. closed items. Any quality concerns.

<h2>8. Safety Report</h2>
Incidents this period, near misses, safety metrics. If none: confirm zero incidents.

<h2>9. Communications & Meetings Summary</h2>
Key decisions made, key communications, stakeholder updates.

<h2>10. Risks & Issues Log</h2>
An HTML table of active risks: Risk | Probability | Impact | Mitigation Action | Owner

<h2>11. Next Week's Action Plan</h2>
Specific, prioritized list of activities planned for next week with owners where inferable.

${sharedContext}`;
    } else {
      // monthly_invoice
      systemPrompt = `You are a senior project management consultant with 30+ years of experience preparing formal invoice backup packages and progress billing documents for construction and consulting projects. Your documents are used in multi-million-dollar contract billing.

Generate a MONTHLY INVOICE BACKUP REPORT in clean HTML. This document is submitted to clients to support a monthly progress billing request. It must be formal, detailed, and defensible.

STRICT HTML FORMATTING RULES:
- Use ONLY these tags: <h2>, <h3>, <h4>, <p>, <ul>, <ol>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <em>, <span>
- Do NOT include <html>, <head>, <body>, <style>, or <script> tags
- Tables must have proper thead/tbody structure
- All financial figures must be precise
- Professional formal tone — this is a legal billing document`;

      userPrompt = `Using the project data below, generate a professional MONTHLY INVOICE BACKUP REPORT for the billing period ${fmtDate(periodStart)} to ${fmtDate(periodEnd)}.

Client: ${project.client?.name || "[CLIENT NAME]"}
Project: ${project.name}
Prepared by: ${companyName}

The report MUST include ALL of these sections in order:

<h2>1. Invoice Summary</h2>
A formal one-paragraph introduction describing this invoice submission: project name, client, billing period, amount being invoiced this period, and cumulative to date.

<h2>2. Progress Summary</h2>
Executive narrative (4–5 paragraphs) describing the overall state of the project: major accomplishments this month, schedule performance, budget health, and key decisions. Write as if presenting to a client executive.

<h2>3. Scope of Work Completed This Period</h2>
Detailed breakdown organized by work category or trade. Each category has a description of what was completed and estimated % complete. Be specific using the daily log data.

<h2>4. Schedule Performance Analysis</h2>
- Milestones completed vs. planned this period
- Schedule Performance Index (SPI): ${spi ? Number(spi).toFixed(2) : "N/A"}
- Variance analysis and corrective actions
- Updated completion forecast
- An HTML table: Milestone | Baseline Date | Forecast Date | Status | Variance (days)

<h2>5. Financial Summary</h2>
An HTML table and narrative covering:
| Line Item | Amount |
| Original Contract Value | ${fmt(budget)} |
| Approved Change Orders to Date | ${fmt(approvedCOAmount)} |
| Revised Contract Value | ${fmt(adjustedBudget)} |
| Total Billed to Date (prior periods) | [Prior billing] |
| Amount Billed This Period | [This invoice amount] |
| Remaining Contract Value | [Remaining] |
| Percent Complete (Financial) | ${spentPct}% |

<h2>6. Earned Value Analysis</h2>
- Cost Performance Index (CPI): ${cpi ? Number(cpi).toFixed(2) : "N/A"}
- Schedule Performance Index (SPI): ${spi ? Number(spi).toFixed(2) : "N/A"}
- Planned Value (PV): ${fmt(plannedValue)}
- Earned Value (EV): ${fmt(earnedValue)}
- Narrative interpretation of EVM metrics and what they mean for project health

<h2>7. Change Orders This Period</h2>
Table of all change orders: Change Order # | Title | Amount | Status | Date Approved

<h2>8. Deliverables Submitted This Period</h2>
List of formal deliverables submitted: reports, drawings, submittals, RFI responses, meeting minutes, etc.

<h2>9. Materials and Resources</h2>
Summary of labor, equipment, and materials deployed this period from daily logs.

<h2>10. Quality & Punch List Status</h2>
Punch list open vs. closed, any quality observations relevant to billing justification.

<h2>11. Safety Performance</h2>
Safety record this period. Total recordable incident rate if applicable.

<h2>12. Outstanding Items & Action Items</h2>
Items requiring client decision or action. Outstanding submittals awaiting approval. Open RFIs blocking progress.

<h2>13. Next Period Work Plan</h2>
What will be accomplished next billing period. Planned milestones to complete.

<h2>14. Certification Statement</h2>
A formal certification paragraph that the work described herein has been completed in accordance with the contract documents, and that the amounts requested are accurate and properly due.

${sharedContext}`;
    }

    // ── Call Gemini API ───────────────────────────────────────────────────────
    const aiResponse = await fetch(
      `${GEMINI_API_BASE}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // ── Stream back as SSE ───────────────────────────────────────────────────
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const payload = JSON.stringify({ choices: [{ delta: { content } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in generate-progress-report function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
