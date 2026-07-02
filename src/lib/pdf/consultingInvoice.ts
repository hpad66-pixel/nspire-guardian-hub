import { newDoc, drawHeader, drawFooter, drawKeyValueBlock, drawTable, downloadPdf, money, type PdfDoc } from './index';

export interface ConsultingInvoicePdfLine {
  description: string;
  fee_amount: number;
  pct_prev: number;
  pct_this: number;
  amount: number;
}

export interface ConsultingInvoicePdfInput {
  invoiceNo: number;
  issueDate: string;
  dueDate?: string | null;
  projectName: string;
  clientName?: string | null;
  tenantName?: string | null;
  notes?: string | null;
  lines: ConsultingInvoicePdfLine[];
  subtotal: number;
  total: number;
  amountPaid?: number;
}

const fmtDate = (s?: string | null) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const pct = (n: number) => `${Math.round(Number(n) || 0)}%`;

export function generateConsultingInvoicePdf(input: ConsultingInvoicePdfInput): PdfDoc {
  const doc = newDoc({ orientation: 'portrait' });

  drawHeader(doc, {
    title: `Invoice #${input.invoiceNo}`,
    subtitle: input.projectName,
    tenantName: input.tenantName ?? undefined,
  });

  drawKeyValueBlock(doc, 40, 116, [
    ['Bill to', input.clientName || '—'],
    ['Issue date', fmtDate(input.issueDate)],
    ['Due date', fmtDate(input.dueDate)],
  ], { colWidth: 90 });

  const y = drawTable(doc, {
    x: 40,
    y: 176,
    columns: [
      { header: 'Scope / description', key: 'description', width: 235, align: 'left' },
      { header: 'Fee', key: 'fee_amount', width: 80, align: 'right', fmt: (v) => money(Number(v)) },
      { header: 'Prev', key: 'pct_prev', width: 45, align: 'right', fmt: (v) => pct(v) },
      { header: 'This', key: 'pct_this', width: 45, align: 'right', fmt: (v) => pct(v) },
      { header: 'Amount', key: 'amount', width: 90, align: 'right', fmt: (v) => money(Number(v)) },
    ],
    rows: input.lines,
  });

  const pageW = doc.internal.pageSize.getWidth();
  let ty = y + 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const rightLabel = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, pageW - 220, ty);
    doc.text(value, pageW - 40, ty, { align: 'right' });
    ty += 16;
  };
  rightLabel('Subtotal', money(input.subtotal));
  if (input.amountPaid && input.amountPaid > 0) {
    rightLabel('Paid', `- ${money(input.amountPaid)}`);
    rightLabel('Balance due', money(input.total - input.amountPaid), true);
  } else {
    rightLabel('Total due', money(input.total), true);
  }

  if (input.notes) {
    ty += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes', 40, ty);
    ty += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(doc.splitTextToSize(input.notes, pageW - 80), 40, ty);
    doc.setTextColor(0);
  }

  drawFooter(doc, { pageLabel: `Invoice #${input.invoiceNo}` });
  return doc;
}

export function downloadConsultingInvoicePdf(input: ConsultingInvoicePdfInput) {
  downloadPdf(generateConsultingInvoicePdf(input), `Invoice-${input.invoiceNo}-${input.projectName}.pdf`.replace(/[^\w.-]+/g, '_'));
}
