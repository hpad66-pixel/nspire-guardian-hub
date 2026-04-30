/**
 * T2.6 · G702/G703-style Pay Application PDF.
 * Cover page (G702) + SOV continuation sheet (G703).
 */
import {
  newDoc, drawHeader, drawFooter, drawKeyValueBlock, drawTable, money,
  downloadPdf, type PdfDoc,
} from "./index";

export interface PayAppPdfInput {
  tenantName?: string;
  contract: {
    contract_no: string;
    title: string;
    original_value: number;
    executed_co_value: number;
    revised_contract_value: number;
    retainage_pct: number;
  };
  payApp: {
    pay_app_no: number;
    period_end: string;
    status: string;
    submitted_amount?: number | null;
    approved_amount?: number | null;
    retainage_held?: number | null;
  };
  project?: { name?: string | null; address?: string | null };
  owner?: { name?: string | null; address?: string | null };
  architect?: { name?: string | null; address?: string | null };
  gc?: { name?: string | null; address?: string | null };
  lines: Array<{
    line_no: number;
    cost_code: string;
    description: string;
    scheduled_value: number;
    work_previous?: number;
    work_this_period: number;
    materials_stored: number;
    pct_complete?: number | null;
  }>;
}

export function generatePayAppPdf(input: PayAppPdfInput): PdfDoc {
  const doc = newDoc({ orientation: "portrait", format: "letter" });

  // ── G702 Cover Page ──────────────────────────────────────
  drawHeader(doc, {
    title: "Application and Certificate for Payment",
    subtitle: `AIA Document G702 · Application No. ${input.payApp.pay_app_no}`,
    tenantName: input.tenantName,
  });

  doc.setFontSize(10);
  const leftCol: Array<[string, string]> = [
    ["To (Owner):", input.owner?.name ?? "—"],
    ["Project:", input.project?.name ?? input.contract.title],
    ["From (Contractor):", input.gc?.name ?? "—"],
    ["Via (Architect):", input.architect?.name ?? "—"],
    ["Contract No:", input.contract.contract_no],
    ["Period To:", input.payApp.period_end],
    ["Application No:", String(input.payApp.pay_app_no)],
    ["Status:", input.payApp.status],
  ];
  drawKeyValueBlock(doc, 40, 120, leftCol, { colWidth: 140 });

  // Summary block — AIA-style column on the right
  const original = input.contract.original_value;
  const changeByCO = input.contract.executed_co_value;
  const revised = input.contract.revised_contract_value;
  const completed = (input.payApp.approved_amount ?? input.payApp.submitted_amount ?? 0);
  const retainage = input.payApp.retainage_held ?? 0;
  const balanceToFinish = revised - completed;

  const rightCol: Array<[string, string]> = [
    ["1. Original Contract Sum", money(original)],
    ["2. Net change by CO", money(changeByCO)],
    ["3. Contract Sum to date", money(revised)],
    ["4. Total Completed + Stored", money(completed)],
    ["5. Retainage", money(retainage)],
    ["6. Less Previous Certificates", money(0)],
    ["7. Current Payment Due", money(completed - retainage)],
    ["8. Balance to Finish + Retainage", money(balanceToFinish + retainage)],
  ];
  drawKeyValueBlock(doc, 320, 120, rightCol, { colWidth: 220 });

  // Signature blocks
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Contractor's Certification", 40, 380);
  doc.setFont("helvetica", "normal");
  doc.text(
    "The undersigned Contractor certifies that to the best of the Contractor's knowledge,\ninformation, and belief, the Work covered by this Application has been completed in\naccordance with the Contract Documents.",
    40, 396, { maxWidth: 520 },
  );
  doc.setDrawColor(150);
  doc.line(40, 450, 260, 450); doc.text("By (Contractor)", 40, 464);
  doc.line(300, 450, 520, 450); doc.text("Date", 300, 464);

  doc.setFont("helvetica", "bold");
  doc.text("Architect's Certification", 40, 500);
  doc.setFont("helvetica", "normal");
  doc.text(
    "In accordance with the Contract Documents, based on on-site observations and the data\ncomprising this application, the Architect certifies to the Owner that to the best of the\nArchitect's knowledge, the Work has progressed as indicated, and the Contractor is entitled\nto payment of the Amount Certified.",
    40, 516, { maxWidth: 520 },
  );
  doc.line(40, 580, 260, 580); doc.text("By (Architect)", 40, 594);
  doc.line(300, 580, 520, 580); doc.text("Date", 300, 594);

  drawFooter(doc, { pageLabel: "G702 · Cover Page" });

  // ── G703 Continuation Sheet ─────────────────────────────
  doc.addPage();
  drawHeader(doc, {
    title: "Continuation Sheet",
    subtitle: `AIA Document G703 · Application No. ${input.payApp.pay_app_no}`,
    tenantName: input.tenantName,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const tableX = 40;
  const tableW = pageW - 80;

  const cols = [
    { header: "Line",    key: "line_no",        width: tableW * 0.05, align: "center" as const },
    { header: "Code",    key: "cost_code",      width: tableW * 0.10 },
    { header: "Description", key: "description", width: tableW * 0.30 },
    { header: "Scheduled", key: "scheduled_value", width: tableW * 0.11, align: "right" as const, fmt: (v: number) => money(v) },
    { header: "This Period", key: "work_this_period", width: tableW * 0.11, align: "right" as const, fmt: (v: number) => money(v) },
    { header: "Materials", key: "materials_stored", width: tableW * 0.10, align: "right" as const, fmt: (v: number) => money(v) },
    { header: "Completed", key: "completed",    width: tableW * 0.11, align: "right" as const, fmt: (_v: number, r: any) => money((r.work_this_period ?? 0) + (r.materials_stored ?? 0)) },
    { header: "%",       key: "pct_complete",   width: tableW * 0.06, align: "right" as const, fmt: (v: number | null, r: any) => {
        const sv = r.scheduled_value ?? 0;
        const comp = (r.work_this_period ?? 0) + (r.materials_stored ?? 0);
        const p = v ?? (sv > 0 ? (comp / sv) * 100 : 0);
        return `${p.toFixed(0)}%`;
      } },
  ];

  drawTable(doc, {
    x: tableX, y: 120,
    columns: cols,
    rows: input.lines,
    onNewPage: (d) => { drawHeader(d, {
      title: "Continuation Sheet", subtitle: `G703 · App ${input.payApp.pay_app_no}`,
      tenantName: input.tenantName,
    }); return 120; },
  });

  drawFooter(doc, { pageLabel: "G703 · Continuation" });
  return doc;
}

export async function downloadPayAppPdf(input: PayAppPdfInput, filename?: string) {
  const doc = generatePayAppPdf(input);
  downloadPdf(doc, filename ?? `PayApp-${input.payApp.pay_app_no}.pdf`);
}
