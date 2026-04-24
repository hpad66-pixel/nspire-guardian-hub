/**
 * T2.7 · AIA G701-style Change Order PDF.
 * Used for PCO / OCO / CCO with the same layout; status reflected in header.
 */
import {
  newDoc, drawHeader, drawFooter, drawKeyValueBlock, drawTable, money,
  downloadPdf, type PdfDoc,
} from "./index";

export interface ChangeOrderPdfInput {
  tenantName?: string;
  co: {
    co_no: number;
    co_type: "PCO" | "OCO" | "CCO";
    title: string;
    description: string | null;
    amount: number;
    days_impact: number;
    status: string;
    reason_code: string | null;
    executed_date: string | null;
  };
  project?: { name?: string | null; address?: string | null };
  contract?: {
    contract_no?: string | null;
    original_value?: number;
    net_changes_prior?: number;
    revised_before_this?: number;
    revised_after_this?: number;
  };
  owner?: { name?: string | null; address?: string | null };
  gc?: { name?: string | null; address?: string | null };
  architect?: { name?: string | null; address?: string | null };
  sub?: { name?: string | null; address?: string | null };
  lines: Array<{ cost_code: string; description: string; amount: number }>;
}

export function generateChangeOrderPdf(input: ChangeOrderPdfInput): PdfDoc {
  const doc = newDoc({ orientation: "portrait", format: "letter" });

  const title = input.co.co_type === "CCO"
    ? "Commitment Change Order"
    : input.co.co_type === "OCO"
      ? "Owner Change Order"
      : "Potential Change Order";

  drawHeader(doc, {
    title,
    subtitle: `AIA Document G701 · ${input.co.co_type}-${String(input.co.co_no).padStart(4, "0")}`,
    tenantName: input.tenantName,
  });

  // Parties block
  const parties: Array<[string, string]> = [
    ["Project:", input.project?.name ?? "—"],
    ["Contract No:", input.contract?.contract_no ?? "—"],
    ["To (Owner):", input.owner?.name ?? "—"],
    ["Contractor:", input.gc?.name ?? "—"],
  ];
  if (input.co.co_type === "CCO") parties.push(["Subcontractor:", input.sub?.name ?? "—"]);
  if (input.architect?.name) parties.push(["Architect:", input.architect.name]);

  drawKeyValueBlock(doc, 40, 120, parties, { colWidth: 120 });

  // Summary (right column)
  const summary: Array<[string, string]> = [
    ["Date:", input.co.executed_date ?? new Date().toISOString().split("T")[0]],
    ["Reason:", input.co.reason_code ?? "—"],
    ["Status:", input.co.status],
    ["Change in Contract Sum:", money(input.co.amount)],
    ["Change in Contract Time:", `${input.co.days_impact} day${input.co.days_impact === 1 ? "" : "s"}`],
  ];
  drawKeyValueBlock(doc, 320, 120, summary, { colWidth: 170 });

  // Description
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Description", 40, 240);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(input.co.description ?? input.co.title, 40, 258, { maxWidth: 520 });

  // Itemized lines
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Items", 40, 310);

  const pageW = doc.internal.pageSize.getWidth();
  const tableW = pageW - 80;

  drawTable(doc, {
    x: 40, y: 320,
    columns: [
      { header: "Cost Code",   key: "cost_code",   width: tableW * 0.18 },
      { header: "Description", key: "description", width: tableW * 0.57 },
      { header: "Amount",      key: "amount",      width: tableW * 0.25, align: "right",
        fmt: (v: number) => money(v) },
    ],
    rows: input.lines.length > 0
      ? input.lines
      : [{ cost_code: "—", description: input.co.title, amount: input.co.amount }],
    onNewPage: (d) => { drawHeader(d, {
      title, subtitle: `G701 · ${input.co.co_type}-${input.co.co_no}`,
      tenantName: input.tenantName,
    }); return 120; },
  });

  // Contract adjustment summary
  if (input.contract) {
    const c = input.contract;
    const summaryY = Math.min(doc.internal.pageSize.getHeight() - 240, 540);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Contract Sum Adjustment", 40, summaryY);

    const adj: Array<[string, string]> = [
      ["Original Contract Sum", money(c.original_value ?? 0)],
      ["Net Changes by Previous CO's", money(c.net_changes_prior ?? 0)],
      ["Contract Sum before this CO", money(c.revised_before_this ?? c.original_value ?? 0)],
      ["This Change Order", money(input.co.amount)],
      ["New Contract Sum", money(c.revised_after_this ?? (c.original_value ?? 0) + input.co.amount)],
    ];
    drawKeyValueBlock(doc, 40, summaryY + 14, adj, { colWidth: 220 });
  }

  // Signature blocks
  const sigY = doc.internal.pageSize.getHeight() - 140;
  doc.setDrawColor(150);
  doc.line(40, sigY, 240, sigY);     doc.setFontSize(9); doc.text("Architect", 40, sigY + 14);
  doc.line(280, sigY, 480, sigY);    doc.text("Owner", 280, sigY + 14);
  const sigY2 = sigY + 50;
  doc.line(40, sigY2, 240, sigY2);   doc.text("Contractor", 40, sigY2 + 14);
  if (input.co.co_type === "CCO") {
    doc.line(280, sigY2, 480, sigY2); doc.text("Subcontractor", 280, sigY2 + 14);
  } else {
    doc.line(280, sigY2, 480, sigY2); doc.text("Date", 280, sigY2 + 14);
  }

  drawFooter(doc, { pageLabel: `G701 · ${input.co.co_type}` });
  return doc;
}

export async function downloadChangeOrderPdf(input: ChangeOrderPdfInput, filename?: string) {
  const doc = generateChangeOrderPdf(input);
  downloadPdf(
    doc,
    filename ?? `${input.co.co_type}-${String(input.co.co_no).padStart(4, "0")}.pdf`,
  );
}
