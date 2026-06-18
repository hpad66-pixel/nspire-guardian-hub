import { newDoc, drawHeader, drawFooter, drawTable, money, downloadPdf } from './index';

interface ContractData {
  contract_number: string;
  contract_title: string;
  contract_value: number;
}

interface SOVItem {
  item_number: string;
  description: string;
  scheduled_value: number;
  completed_to_date?: number;
}

interface ChangeOrder {
  co_number: string;
  title: string;
  amount: number;
  status: string;
  co_date: string | null;
}

interface Invoice {
  invoice_number: string | null;
  period_start: string | null;
  period_end: string | null;
  amount: number;
  retainage: number;
  net_due: number | null;
  status: string;
}

interface Payment {
  payment_date: string;
  reference: string | null;
  amount: number;
  payment_method: string | null;
}

export interface FinancialReportData {
  projectName: string;
  companyName?: string;
  reportDate?: Date;
  contract: ContractData;
  sovItems: SOVItem[];
  changeOrders: ChangeOrder[];
  invoices: Invoice[];
  payments: Payment[];
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function generateFinancialReport(data: FinancialReportData) {
  const doc = newDoc({ orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const reportDate = data.reportDate ?? new Date();

  drawHeader(doc, {
    title: 'Financial Summary Report',
    subtitle: data.projectName,
    tenantName: data.companyName,
  });

  let y = 108;

  // ── Contract Summary ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Contract Summary', 40, y);
  y += 16;

  const totalCOs = data.changeOrders.reduce((s, c) => s + c.amount, 0);
  const revisedValue = data.contract.contract_value + totalCOs;
  const totalBilled = data.invoices.reduce((s, i) => s + i.amount, 0);
  const totalRetainage = data.invoices.reduce((s, i) => s + i.retainage, 0);
  const totalPaid = data.payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = (totalBilled - totalRetainage) - totalPaid;

  const summaryItems: [string, string, string, string][] = [
    ['Original Contract Value', money(data.contract.contract_value), 'Total Change Orders', money(totalCOs)],
    ['Revised Contract Value', money(revisedValue), 'Total Billed (Gross)', money(totalBilled)],
    ['Retainage Held', money(totalRetainage), 'Net Certified', money(totalBilled - totalRetainage)],
    ['Total Paid', money(totalPaid), 'Outstanding Balance', money(outstanding)],
  ];

  doc.setFontSize(9);
  for (const [lk, lv, rk, rv] of summaryItems) {
    doc.setFont('helvetica', 'bold'); doc.text(lk, 40, y);
    doc.setFont('helvetica', 'normal'); doc.text(lv, 200, y);
    doc.setFont('helvetica', 'bold'); doc.text(rk, 320, y);
    doc.setFont('helvetica', 'normal'); doc.text(rv, 480, y);
    y += 14;
  }

  y += 12;

  // ── Schedule of Values ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Schedule of Values', 40, y);
  y += 8;

  y = drawTable(doc, {
    x: 40, y,
    columns: [
      { key: 'item_number', header: '#', width: 40 },
      { key: 'description', header: 'Description', width: 280 },
      { key: 'scheduled_value', header: 'Scheduled Value', width: 110, align: 'right', fmt: v => money(v) },
      { key: 'completed_to_date', header: 'Completed', width: 80, align: 'right', fmt: v => v != null ? money(v) : '—' },
    ],
    rows: data.sovItems,
    onNewPage: (d) => { drawHeader(d, { title: 'Financial Summary Report', subtitle: data.projectName }); return 108; },
  });

  // SOV total row
  const totalSOV = data.sovItems.reduce((s, i) => s + i.scheduled_value, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL', 46, y + 14);
  doc.text(money(totalSOV), 510 - 6, y + 14, { align: 'right' });
  y += 24;

  // ── Change Orders ─────────────────────────────────────────────────
  if (data.changeOrders.length > 0) {
    if (y + 80 > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Change Orders', 40, y);
    y += 8;

    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { key: 'co_number', header: 'CO #', width: 70 },
        { key: 'title', header: 'Title', width: 220 },
        { key: 'co_date', header: 'Date', width: 90, fmt: v => fmtDate(v) },
        { key: 'status', header: 'Status', width: 80, align: 'center' },
        { key: 'amount', header: 'Amount', width: 90, align: 'right', fmt: v => money(v) },
      ],
      rows: data.changeOrders,
      onNewPage: (d) => { drawHeader(d, { title: 'Financial Summary Report', subtitle: data.projectName }); return 108; },
    });
    y += 16;
  }

  // ── Pay Applications ──────────────────────────────────────────────
  if (data.invoices.length > 0) {
    if (y + 80 > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Pay Applications', 40, y);
    y += 8;

    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { key: 'invoice_number', header: 'Pay App', width: 70, fmt: v => v ?? '—' },
        { key: 'period_start', header: 'Period', width: 150, fmt: (v, row) => `${fmtDate(v)} – ${fmtDate(row.period_end)}` },
        { key: 'amount', header: 'Gross Billed', width: 100, align: 'right', fmt: v => money(v) },
        { key: 'retainage', header: 'Retainage', width: 90, align: 'right', fmt: v => `(${money(v)})` },
        { key: 'net_due', header: 'Net Certified', width: 100, align: 'right', fmt: (v, row) => money(v ?? (row.amount - row.retainage)) },
        { key: 'status', header: 'Status', width: 52, align: 'center' },
      ],
      rows: data.invoices,
      onNewPage: (d) => { drawHeader(d, { title: 'Financial Summary Report', subtitle: data.projectName }); return 108; },
    });
    y += 16;
  }

  // ── Payments ──────────────────────────────────────────────────────
  if (data.payments.length > 0) {
    if (y + 80 > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Payments Received', 40, y);
    y += 8;

    let running = 0;
    const payRows = [...data.payments]
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
      .map(p => { running += p.amount; return { ...p, running }; });

    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { key: 'payment_date', header: 'Date', width: 100, fmt: v => fmtDate(v) },
        { key: 'reference', header: 'Reference', width: 200, fmt: v => v ?? '—' },
        { key: 'payment_method', header: 'Method', width: 90, fmt: v => v ?? '—' },
        { key: 'amount', header: 'Amount', width: 90, align: 'right', fmt: v => money(v) },
        { key: 'running', header: 'Cumulative', width: 90, align: 'right', fmt: v => money(v) },
      ],
      rows: payRows,
      onNewPage: (d) => { drawHeader(d, { title: 'Financial Summary Report', subtitle: data.projectName }); return 108; },
    });
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL PAID', 46, y + 14);
    doc.text(money(totalPaid), 570 - 6, y + 14, { align: 'right' });
    y += 24;
  }

  drawFooter(doc, { generatedAt: reportDate, pageLabel: data.contract.contract_number });
  const slug = data.contract.contract_number.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadPdf(doc, `financial-report-${slug}-${reportDate.toISOString().split('T')[0]}.pdf`);
}
