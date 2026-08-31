/**
 * Corporate consulting client invoice PDF — APAS gold / sapphire identity.
 * Includes bill-to address, subject, payment terms, running account summary
 * (prior billed / paid + this invoice), notes, and client sign-off block.
 */
import { jsPDF } from 'jspdf';
import type { ProposalAccountSummary } from '@/lib/consulting/billing';

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
  companyPhone?: string | null;
  wordmark?: string | null;
  footer?: string | null;
}

export interface ConsultingInvoicePdfPriorPayment {
  invoiceNo: number;
  date: string;
  amount: number;
  note?: string | null;
}

export interface ConsultingInvoicePdfInput {
  invoiceNo: number;
  issueDate: string;
  dueDate?: string | null;
  projectName: string;
  subject?: string | null;
  paymentTerms?: string | null;
  poNumber?: string | null;
  clientName?: string | null;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  clientState?: string | null;
  clientPostal?: string | null;
  tenantName?: string | null;
  notes?: string | null;
  lines: ConsultingInvoicePdfLine[];
  subtotal: number;
  total: number;
  /** Cash received against *this* invoice. */
  amountPaid?: number;
  /** Prior invoices / payments for continuity on the same proposals. */
  accountSummaries?: ProposalAccountSummary[];
  priorPayments?: ConsultingInvoicePdfPriorPayment[];
  branding?: ConsultingInvoicePdfBranding | null;
}

const GOLD: [number, number, number] = [196, 163, 90];
const INK: [number, number, number] = [26, 23, 20];
const MUTE: [number, number, number] = [107, 107, 107];
const LIGHT: [number, number, number] = [243, 239, 230];
const SAPPHIRE: [number, number, number] = [29, 111, 232];
const CREAM: [number, number, number] = [250, 248, 244];

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
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const cw = W - M * 2;
  let y = M;

  const brand = input.branding;
  const company = (brand?.companyName || input.tenantName || 'APAS CONSULTING').toUpperCase();

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const ensure = (h: number) => {
    if (y + h > H - M - 48) {
      doc.addPage();
      y = M;
    }
  };

  // Brand header band
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(0, 0, W, 78, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(INK);
  doc.text(company, M, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(MUTE);
  const companyLines = [
    brand?.companyAddress,
    brand?.companyCity,
    [brand?.companyPhone, brand?.companyEmail].filter(Boolean).join(' · '),
  ].filter(Boolean) as string[];
  let hy = 48;
  for (const line of companyLines.slice(0, 2)) {
    doc.text(line, M, hy, { maxWidth: cw * 0.55 });
    hy += 11;
  }

  // Invoice badge (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  setColor(SAPPHIRE);
  doc.text('INVOICE', W - M, 34, { align: 'right' });
  doc.setFontSize(12);
  setColor(INK);
  doc.text(`#${input.invoiceNo}`, W - M, 52, { align: 'right' });

  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(2.5);
  doc.line(0, 78, W, 78);
  y = 100;

  // Subject / RE
  if (input.subject) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(GOLD);
    doc.text('RE / SUBJECT', M, y);
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(INK);
    const subLines = doc.splitTextToSize(input.subject, cw);
    doc.text(subLines, M, y);
    y += subLines.length * 13 + 10;
  }

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
  const billName = input.clientName || input.clientCompany || '—';
  doc.text(billName, M, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setColor(MUTE);
  let leftY = y + 13;
  if (input.clientCompany && input.clientName && input.clientCompany !== input.clientName) {
    doc.text(input.clientCompany, M, leftY);
    leftY += 12;
  }
  if (input.clientAddress) {
    doc.text(input.clientAddress, M, leftY, { maxWidth: cw * 0.48 });
    leftY += 12;
  }
  const cityLine = [input.clientCity, input.clientState, input.clientPostal].filter(Boolean).join(', ');
  if (cityLine) {
    doc.text(cityLine, M, leftY);
    leftY += 12;
  }
  if (input.clientEmail) {
    doc.text(input.clientEmail, M, leftY);
    leftY += 12;
  }
  if (input.clientPhone) {
    doc.text(input.clientPhone, M, leftY);
    leftY += 12;
  }

  let rightY = y;
  const meta: [string, string][] = [
    ['Issue date', fmtDate(input.issueDate)],
    ['Due date', fmtDate(input.dueDate)],
    ['Project', input.projectName],
  ];
  if (input.poNumber) meta.push(['PO / Ref', input.poNumber]);
  if (input.paymentTerms) meta.push(['Terms', input.paymentTerms.split(/[.—]/)[0].trim() || input.paymentTerms]);
  for (const [k, v] of meta) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(MUTE);
    doc.text(k, col2, rightY);
    doc.setFont('helvetica', 'bold');
    setColor(INK);
    const valLines = doc.splitTextToSize(v, cw * 0.38);
    doc.text(valLines, W - M, rightY, { align: 'right' });
    rightY += Math.max(14, valLines.length * 11);
  }
  y = Math.max(leftY, rightY) + 18;

  // Account continuity summary (prior billed / paid for selected proposals)
  const summaries = input.accountSummaries ?? [];
  if (summaries.length > 0) {
    ensure(70 + summaries.length * 14);
    doc.setFillColor(CREAM[0], CREAM[1], CREAM[2]);
    const boxH = 28 + summaries.length * 14 + (summaries.some((s) => s.previously_billed > 0) ? 36 : 0);
    doc.roundedRect(M, y, cw, boxH, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(GOLD);
    doc.text('ACCOUNT SUMMARY — RUNNING TAB', M + 10, y + 14);
    let sy = y + 28;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    for (const s of summaries) {
      setColor(INK);
      doc.text(`${s.proposal_no}`, M + 10, sy);
      setColor(MUTE);
      doc.text(
        `Approved ${usd(s.approved_fee)}  ·  Prior billed ${usd(s.previously_billed)}  ·  Prior paid ${usd(s.previously_paid)}  ·  This invoice ${usd(s.this_invoice)}`,
        M + 70,
        sy,
        { maxWidth: cw - 90 },
      );
      sy += 14;
    }
    const priorBilled = summaries.reduce((a, s) => a + s.previously_billed, 0);
    const priorPaid = summaries.reduce((a, s) => a + s.previously_paid, 0);
    const thisInv = summaries.reduce((a, s) => a + s.this_invoice, 0);
    if (priorBilled > 0 || priorPaid > 0) {
      sy += 4;
      doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.setLineWidth(0.5);
      doc.line(M + 10, sy, W - M - 10, sy);
      sy += 12;
      doc.setFont('helvetica', 'bold');
      setColor(INK);
      doc.text(
        `Prior open A/R ${usd(Math.max(0, priorBilled - priorPaid))}   ·   Amount this invoice ${usd(thisInv)}`,
        M + 10,
        sy,
      );
    }
    y += boxH + 16;
  }

  // Prior payments list (cash continuity)
  const priorPays = input.priorPayments ?? [];
  if (priorPays.length > 0) {
    ensure(40 + priorPays.length * 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(GOLD);
    doc.text('PAYMENTS RECEIVED (PRIOR)', M, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const p of priorPays.slice(0, 8)) {
      setColor(MUTE);
      doc.text(`Inv #${p.invoiceNo} · ${fmtDate(p.date)}${p.note ? ` · ${p.note}` : ''}`, M, y);
      setColor(INK);
      doc.text(usd(p.amount), W - M, y, { align: 'right' });
      y += 12;
    }
    y += 8;
  }

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

  input.lines.forEach((line, idx) => {
    const descLines = doc.splitTextToSize(line.description || '—', cols[0].w - 4);
    const rowH = Math.max(26, descLines.length * 12 + 10);
    ensure(rowH + 4);
    if (idx % 2 === 0) {
      doc.setFillColor(CREAM[0], CREAM[1], CREAM[2]);
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

  // Totals box
  y += 16;
  ensure(110);
  const boxW = 220;
  const boxX = W - M - boxW;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(1.25);
  doc.line(boxX, y, W - M, y);
  y += 18;

  const paid = Number(input.amountPaid) || 0;
  const balanceDue = Math.round((input.total - paid) * 100) / 100;
  const rows: [string, string, boolean][] = [['Subtotal', usd(input.subtotal), false]];
  if (paid > 0) {
    rows.push(['Payments on this invoice', `− ${usd(paid)}`, false]);
  }
  rows.push(['Amount due', usd(balanceDue), true]);

  for (const [label, value, bold] of rows) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    setColor(bold ? SAPPHIRE : MUTE);
    doc.text(label, boxX, y);
    setColor(bold ? INK : MUTE);
    doc.text(value, W - M, y, { align: 'right' });
    y += bold ? 18 : 15;
  }

  // Amount due highlight
  y += 6;
  doc.setFillColor(SAPPHIRE[0], SAPPHIRE[1], SAPPHIRE[2]);
  doc.roundedRect(boxX, y, boxW, 28, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('PLEASE REMIT', boxX + 10, y + 18);
  doc.setFontSize(12);
  doc.text(usd(balanceDue), W - M - 10, y + 18, { align: 'right' });
  y += 40;

  // Payment terms + notes
  if (input.paymentTerms) {
    ensure(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(GOLD);
    doc.text('PAYMENT TERMS', M, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setColor(MUTE);
    const termLines = doc.splitTextToSize(input.paymentTerms, cw);
    doc.text(termLines, M, y);
    y += termLines.length * 12 + 10;
  }

  if (input.notes) {
    ensure(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(GOLD);
    doc.text('NOTES', M, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setColor(MUTE);
    const noteLines = doc.splitTextToSize(input.notes, cw);
    doc.text(noteLines, M, y);
    y += noteLines.length * 12 + 14;
  }

  // Client approval / sign-off block
  ensure(120);
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(1);
  doc.roundedRect(M, y, cw, 100, 4, 4, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor(GOLD);
  doc.text('CLIENT APPROVAL & SIGN-OFF', M + 12, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(MUTE);
  doc.text(
    'By signing below, the Client acknowledges receipt of this invoice, approves the amounts shown, and authorizes payment per the stated terms.',
    M + 12,
    y + 30,
    { maxWidth: cw - 24 },
  );

  const sigY = y + 62;
  doc.setDrawColor(MUTE[0], MUTE[1], MUTE[2]);
  doc.setLineWidth(0.6);
  // Signature
  doc.line(M + 12, sigY, M + 200, sigY);
  doc.setFontSize(7.5);
  doc.text('Authorized signature', M + 12, sigY + 11);
  // Printed name
  doc.line(M + 220, sigY, M + 380, sigY);
  doc.text('Printed name / title', M + 220, sigY + 11);
  // Date
  doc.line(M + 400, sigY, W - M - 12, sigY);
  doc.text('Date', M + 400, sigY + 11);

  // Approval checkbox line
  doc.rect(M + 12, y + 78, 8, 8, 'S');
  doc.text('Approved for payment — please process and remit the Amount Due above.', M + 26, y + 85);

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
    const foot = brand?.footer || `${company} · Invoice #${input.invoiceNo} · Thank you for your business`;
    doc.text(foot, M, H - 22, { maxWidth: cw * 0.7 });
    doc.text(`Page ${i} of ${pageCount}`, W - M, H - 22, { align: 'right' });
  }

  return doc;
}

export function downloadConsultingInvoicePdf(input: ConsultingInvoicePdfInput) {
  const doc = generateConsultingInvoicePdf(input);
  const safe = `Invoice-${input.invoiceNo}-${input.projectName}`.replace(/[^\w.-]+/g, '_');
  doc.save(`${safe}.pdf`);
}
