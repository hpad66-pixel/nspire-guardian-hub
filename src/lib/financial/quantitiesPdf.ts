import { jsPDF } from "jspdf";
import type { SovProgressRow } from "@/hooks/useSovProgress";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);
const qfmt = (n: number) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
};
const pfmt = (n: number) => `${Number(n || 0).toFixed(1)}%`;

interface Col { t: string; w: number; a: "left" | "right" | "center"; x: number; render: (r: SovProgressRow) => string }

/** Build a clean tabular PDF of the quantities list (selected lines, with/without $). */
export function buildQuantitiesPdf(opts: {
  lines: SovProgressRow[];
  showMoney: boolean;
  projectName: string;
  payAppNo: number | null;
  intro?: string;
}): { base64: string; filename: string; size: number } {
  const { lines, showMoney, projectName, payAppNo, intro } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 36;
  const lineH = 11;

  const cols: Col[] = [
    { t: "#", w: 26, a: "left", x: 0, render: (r) => r.item_no },
    { t: "Description", w: 0, a: "left", x: 0, render: (r) => r.description },
    { t: "Unit", w: 38, a: "center", x: 0, render: (r) => r.unit ?? "—" },
    { t: "Sched Qty", w: 64, a: "right", x: 0, render: (r) => qfmt(r.scheduled_qty) },
    { t: "Built to Date", w: 70, a: "right", x: 0, render: (r) => qfmt(r.qty_to_date) },
    { t: "Remaining", w: 66, a: "right", x: 0, render: (r) => qfmt(r.qty_remaining) },
    { t: "% Compl.", w: 50, a: "right", x: 0, render: (r) => pfmt(r.pct_complete) },
    ...(showMoney
      ? ([
          { t: "Sched $", w: 66, a: "right", x: 0, render: (r) => money(r.scheduled_value) },
          { t: "Earned", w: 66, a: "right", x: 0, render: (r) => money(r.value_to_date) },
          { t: "To Complete", w: 70, a: "right", x: 0, render: (r) => money(r.value_remaining) },
        ] as Col[])
      : []),
  ];
  const fixed = cols.reduce((s, c) => s + c.w, 0);
  const desc = cols.find((c) => c.w === 0)!;
  desc.w = PW - 2 * M - fixed;
  let cx = M;
  for (const c of cols) { c.x = cx; cx += c.w; }

  let y = M;
  const tx = (c: Col) => (c.a === "right" ? c.x + c.w - 3 : c.a === "center" ? c.x + c.w / 2 : c.x + 2);

  function header() {
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text(`${projectName} — Quantities & Progress`, M, y); y += 15;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110, 110, 110);
    doc.text(`Through Pay App #${payAppNo ?? "—"}  ·  ${showMoney ? "with dollar values" : "quantities only"}`, M, y);
    y += 13;
    if (intro && intro.trim()) {
      doc.setTextColor(40, 40, 40);
      const wrapped = doc.splitTextToSize(intro.trim(), PW - 2 * M) as string[];
      doc.text(wrapped, M, y); y += wrapped.length * lineH + 4;
    }
    colHeader();
  }
  function colHeader() {
    y += 6;
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(90, 90, 90);
    for (const c of cols) doc.text(c.t, tx(c), y, { align: c.a });
    y += 4;
    doc.setDrawColor(26, 23, 20).setLineWidth(1).line(M, y, PW - M, y);
    y += 9;
    doc.setFont("helvetica", "normal").setTextColor(20, 20, 20);
  }
  function ensure(h: number) {
    if (y + h > PH - M) { doc.addPage(); y = M; colHeader(); }
  }

  function row(r: SovProgressRow) {
    doc.setFontSize(8.5).setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(r.description, desc.w - 4) as string[];
    const h = Math.max(lineH, descLines.length * lineH);
    ensure(h + 4);
    for (const c of cols) {
      if (c === desc) doc.text(descLines, c.x + 2, y, { align: "left" });
      else doc.text(c.render(r), tx(c), y, { align: c.a });
    }
    y += h;
    doc.setDrawColor(235, 235, 235).setLineWidth(0.5).line(M, y + 1, PW - M, y + 1);
    y += 4;
  }

  function subtotal(label: string, list: SovProgressRow[]) {
    if (!list.length) return;
    const sv = list.reduce((s, r) => s + r.scheduled_value, 0);
    const vd = list.reduce((s, r) => s + r.value_to_date, 0);
    const pct = sv ? (vd / sv) * 100 : 0;
    ensure(lineH + 6);
    doc.setFillColor(244, 241, 234).rect(M, y - lineH + 2, PW - 2 * M, lineH + 4, "F");
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(20, 20, 20);
    doc.text(`${label} subtotal`, cols[0].x + 2, y);
    const pctCol = cols.find((c) => c.t === "% Compl.")!;
    doc.text(pfmt(pct), tx(pctCol), y, { align: "right" });
    if (showMoney) {
      doc.text(money(sv), tx(cols[cols.length - 3]), y, { align: "right" });
      doc.text(money(vd), tx(cols[cols.length - 2]), y, { align: "right" });
      doc.text(money(sv - vd), tx(cols[cols.length - 1]), y, { align: "right" });
    }
    y += lineH + 8;
    doc.setFont("helvetica", "normal");
  }

  header();
  const base = lines.filter((l) => l.kind === "base");
  const co = lines.filter((l) => l.kind === "change_order");
  if (base.length) { base.forEach(row); subtotal("Base contract", base); }
  if (co.length) { co.forEach(row); subtotal("Change orders", co); }

  // page footer numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(150, 150, 150);
    doc.text(`Proj OS · ${new Date().toLocaleDateString()}`, M, PH - 18);
    doc.text(`Page ${i} of ${pages}`, PW - M, PH - 18, { align: "right" });
  }

  const uri = doc.output("datauristring");
  const base64 = uri.split(",")[1] ?? "";
  const safe = projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "quantities";
  return { base64, filename: `${safe}-quantities.pdf`, size: Math.floor(base64.length * 0.75) };
}
