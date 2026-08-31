/**
 * Branded consulting client invoice PDF — APAS gold / sapphire identity,
 * matching proposalPdf styling so consulting engagements feel like one suite.
 */
import { jsPDF } from 'jspdf';

export interface ConsultingInvoicePdfLine {
  description: string;
  fee_amount: number;
  pct_prev: number;
  pct_this: number;
  amount: number;
}

export interface ConsultingInvoicePdfBranding {
  companyName?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyEmail?: string | null;
  companyContact?: string | null;
  wordmark?: string | null;
  footer?: string | null;
}

export interface ConsultingInvoicePdfInput {
  invoiceNo: number;
  issueDate: string;
  dueDate?: string | null;
  projectName: string;
  clientName?: string | null;
  clientCompany?: string | null;
  clientEmail?: string | null;
  tenantName?: string | null;
  notes?: string | null;
  lines: ConsultingInvoicePdfLine[];
  subtotal: number;
  total: number;
  amountPaid?: number;
  branding?: ConsultingInvoicePdfBranding | null;
}

const GOLD: [number, number, number] = [196, 163, 90];
const INK: [number, number, number] = [26, 23, 20];
const MUTE: [number, number, number] = [107, 107, 107];
const LIGHT: [number, number, number] = [243, 239, 230];
const SAPPHIRE: [number, number, number] = [29, 111, 232];

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const fmtDate = (s?: string | null) =>
  s
    ? new Date(s.includes('T') ? s : `${s}T00:00:00`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

const pct = (n: number) => `${Math.round(Number(n) || 0)}%`;

export function generateConsultingInvoicePdf(input: ConsultingInvoicePdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const cw = W - M * 2;
  let y = M;

  const brand = input.branding;
  const company = (brand?.companyName || input.tenantName || 'APAS CONSULTING').toUpperCase();

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const ensure = (h: number) => {
    if (y + h > H - M - 24) {
      doc.addPage();
      y = M;
    }
  };

  // Brand header band
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(0, 0, W, 72, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setColor(INK);
  doc.text(company, M, 36);
  if (brand?.companyAddress || brand?.companyCity || brand?.companyEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(MUTE);
    const addr = [brand?.companyAddress, brand?.companyCity, brand?.companyEmail].filter(Boolean).join(' · ');
    doc.text(addr, M, 52, { maxWidth: cw * 0.65 });
  }
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(2.5);
  doc.line(0, 72, W, 72);
  y = 96;

  // Title row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setColor(INK);
  doc.text('INVOICE', M, y);
  doc.setFontSize(12);
  setColor(SAPPHIRE);
  doc.text(`#${input.invoiceNo}`, M + 90, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(MUTE);
  doc.text(input.projectName, M, y);
  y += 28;

  // Bill-to / meta columns
  const col2 = M + cw * 0.55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor(GOLD);
  doc.text('BILL TO', M, y);
  doc.text('INVOICE DETAILS', col2, y);
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(INK);
  doc.text(input.clientName || input.clientCompany || '—', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(MUTE);
  let leftY = y + 14;
  if (input.clientCompany && input.clientName) {
    doc.text(input.clientCompany, M, leftY);
    leftY += 13;
  }
  if (input.clientEmail) {
    doc.text(input.clientEmail, M, leftY);
    leftY += 13;
  }

  let rightY = y;
  const meta = [
    ['Issue date', fmtDate(input.issueDate)],
    ['Due date', fmtDate(input.dueDate)],
    ['Project', input.projectName],
  ];
  for (const [k, v] of meta) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(MUTE);
    doc.text(k, col2, rightY);
    doc.setFont('helvetica', 'bold');
    setColor(INK);
    doc.text(v, W - M, rightY, { align: 'right' });
    rightY += 14;
  }
  y = Math.max(leftY, rightY) + 20;

  // Line table header
  ensure(40);
  doc.setFillColor(INK[0], INK[1], INK[2]);
  doc.rect(M, y, cw, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const cols = [
    { x: M + 8, w: cw * 0.42, label: 'DESCRIPTION', align: 'left' as const },
    { x: M + cw * 0.48, w: cw * 0.12, label: 'FEE', align: 'right' as const },
    { x: M + cw * 0.60, w: cw * 0.10, label: 'PREV', align: 'right' as const },
    { x: M + cw * 0.70, w: cw * 0.10, label: 'THIS', align: 'right' as const },
    { x: M + cw * 0.82, w: cw * 0.16, label: 'AMOUNT', align: 'right' as const },
  ];
  for (const c of cols) {
    doc.text(c.label, c.align === 'right' ? c.x + c.w : c.x, y + 14, {
      align: c.align,
    });
  }
  y += 22;

  // Rows
  input.lines.forEach((line, idx) => {
    const descLines = doc.splitTextToSize(line.description || '—', cols[0].w - 4);
    const rowH = Math.max(26, descLines.length * 12 + 10);
    ensure(rowH + 4);
    if (idx % 2 === 0) {
      doc.setFillColor(250, 248, 244);
      doc.rect(M, y, cw, rowH, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setColor(INK);
    doc.text(descLines, cols[0].x, y + 14);
    const showPct = line.fee_amount > 0 && (line.pct_this > 0 || line.pct_prev > 0);
    doc.text(showPct ? usd(line.fee_amount) : '—', cols[1].x + cols[1].w, y + 14, { align: 'right' });
    doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    doc.text(showPct ? pct(line.pct_prev) : '—', cols[2].x + cols[2].w, y + 14, { align: 'right' });
    doc.text(showPct ? pct(line.pct_this) : '—', cols[3].x + cols[3].w, y + 14, { align: 'right' });
    setColor(INK);
    doc.setFont('helvetica', 'bold');
    doc.text(usd(line.amount), cols[4].x + cols[4].w, y + 14, { align: 'right' });
    y += rowH;
  });

  // Totals
  y += 16;
  ensure(90);
  const boxW = 200;
  const boxX = W - M - boxW;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(1);
  doc.line(boxX, y, W - M, y);
  y += 18;

  const paid = Number(input.amountPaid) || 0;
  const rows: [string, string, boolean][] = [['Subtotal', usd(input.subtotal), false]];
  if (paid > 0) {
    rows.push(['Paid', `− ${usd(paid)}`, false]);
    rows.push(['Balance due', usd(input.total - paid), true]);
  } else {
    rows.push(['Total due', usd(input.total), true]);
  }
  for (const [label, value, bold] of rows) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    setColor(bold ? SAPPHIRE : MUTE);
    doc.text(label, boxX, y);
    setColor(bold ? INK : MUTE);
    doc.text(value, W - M, y, { align: 'right' });
    y += bold ? 18 : 15;
  }

  if (input.notes) {
    y += 16;
    ensure(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setColor(GOLD);
    doc.text('NOTES', M, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setColor(MUTE);
    const noteLines = doc.splitTextToSize(input.notes, cw);
    doc.text(noteLines, M, y);
    y += noteLines.length * 12 + 8;
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(1);
    doc.line(M, H - 36, W - M, H - 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(MUTE);
    const foot = brand?.footer || `${company} · Invoice #${input.invoiceNo}`;
    doc.text(foot, M, H - 22);
    doc.text(`Page ${i} of ${pageCount}`, W - M, H - 22, { align: 'right' });
  }

  return doc;
}

export function downloadConsultingInvoicePdf(input: ConsultingInvoicePdfInput) {
  const doc = generateConsultingInvoicePdf(input);
  const safe = `Invoice-${input.invoiceNo}-${input.projectName}`.replace(/[^\w.-]+/g, '_');
  doc.save(`${safe}.pdf`);
}
