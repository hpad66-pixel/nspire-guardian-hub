import { useMemo, useState } from 'react';
import { BrandedReportEmailDialog, type PreparedReportDelivery } from '@/components/reports/BrandedReportEmailDialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { buildQuantitiesPdf } from '@/lib/financial/quantitiesPdf';
import type { SovProgressRow } from '@/hooks/useSovProgress';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const qfmt = (n: number) => {
  const value = Number(n || 0);
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
};
const pfmt = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const clean = (value: unknown) => String(value ?? '').replace(/[—–‑]/g, '-');
const escapeHtml = (value: unknown) => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

function buildHtml(lines: SovProgressRow[], showMoney: boolean, projectName: string, payAppNo: number | null, intro: string) {
  const th = (text: string, align = 'left') => `<th style="padding:8px;text-align:${align};border-bottom:2px solid #082b23;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#53665f;">${text}</th>`;
  const td = (text: string, align = 'left', strong = false) => `<td style="padding:8px;text-align:${align};border-bottom:1px solid #e3e9e6;${strong ? 'font-weight:700;' : ''}">${text}</td>`;
  const header = `<tr>${th('#')}${th('Description')}${th('Unit', 'center')}${th('Scheduled', 'right')}${th('Built to date', 'right')}${th('Remaining', 'right')}${th('% complete', 'right')}${showMoney ? `${th('Scheduled value', 'right')}${th('Earned', 'right')}${th('To complete', 'right')}` : ''}</tr>`;
  const rowsHtml = (list: SovProgressRow[]) => list.map((row) => `<tr>${td(escapeHtml(row.item_no))}${td(escapeHtml(row.description))}${td(escapeHtml(row.unit ?? '-'), 'center')}${td(qfmt(row.scheduled_qty), 'right')}${td(qfmt(row.qty_to_date), 'right')}${td(qfmt(row.qty_remaining), 'right')}${td(pfmt(row.pct_complete), 'right')}${showMoney ? `${td(money(row.scheduled_value), 'right')}${td(money(row.value_to_date), 'right')}${td(money(row.value_remaining), 'right')}` : ''}</tr>`).join('');
  const section = (label: string, list: SovProgressRow[]) => {
    if (!list.length) return '';
    const scheduled = list.reduce((sum, row) => sum + row.scheduled_value, 0);
    const earned = list.reduce((sum, row) => sum + row.value_to_date, 0);
    const pct = scheduled ? (earned / scheduled) * 100 : 0;
    const subtotal = `<tr style="background:#f0f7f4;">${td(`${label} subtotal`, 'left', true)}<td colspan="5"></td>${td(pfmt(pct), 'right', true)}${showMoney ? `${td(money(scheduled), 'right', true)}${td(money(earned), 'right', true)}${td(money(scheduled - earned), 'right', true)}` : ''}</tr>`;
    return rowsHtml(list) + subtotal;
  };
  const base = lines.filter((line) => line.kind === 'base');
  const changeOrders = lines.filter((line) => line.kind === 'change_order');
  const personal = intro ? `<div style="margin:0 0 20px;border-left:4px solid #dfbd67;background:#fff9e8;padding:14px 16px;color:#4b452f;font-size:14px;line-height:1.6;">${escapeHtml(intro).replace(/\n/g, '<br>')}</div>` : '';
  return `<div style="margin:0;background:#edf2ef;padding:20px 8px;font-family:Arial,sans-serif;color:#173a32;"><div style="max-width:900px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;"><div style="height:6px;background:#dfbd67;"></div><div style="background:#082b23;color:#fff;padding:28px;"><div style="color:#edce79;font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">APAS Project Controls | Proj OS</div><h1 style="margin:16px 0 7px;font:700 28px/1.15 Georgia,serif;">Quantities &amp; Progress</h1><div style="color:#c9ddd6;font-size:14px;">${escapeHtml(projectName)} | Through Pay App #${payAppNo ?? '-'}</div></div><div style="padding:24px 28px;">${personal}<p style="margin:0 0 16px;color:#53665f;font-size:13px;">${lines.length} line items | ${showMoney ? 'Dollar values included' : 'Quantities only'}</p><div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;font-size:12px;"><thead>${header}</thead><tbody>${section('Base contract', base)}${section('Change orders', changeOrders)}</tbody></table></div><p style="margin:18px 0 0;color:#72817c;font-size:11px;">A matching PDF copy is attached for review and recordkeeping.</p></div></div></div>`;
}

export function QuantitiesEmailDialog({
  open,
  onOpenChange,
  rows,
  selectedIds,
  showMoney: initialShowMoney,
  projectId,
  projectName,
  payAppNo,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  rows: SovProgressRow[];
  selectedIds: Set<string>;
  showMoney: boolean;
  projectId?: string;
  projectName: string;
  payAppNo: number | null;
}) {
  const [showMoney, setShowMoney] = useState(initialShowMoney);
  const lines = useMemo(() => selectedIds.size ? rows.filter((row) => selectedIds.has(row.sov_line_item_id)) : rows, [rows, selectedIds]);

  async function prepareDelivery(personalMessage: string): Promise<PreparedReportDelivery> {
    const pdf = buildQuantitiesPdf({ lines, showMoney, projectName, payAppNo, intro: personalMessage });
    return {
      bodyHtml: buildHtml(lines, showMoney, projectName, payAppNo, personalMessage),
      bodyText: clean([personalMessage, `QUANTITIES & PROGRESS - ${projectName}`, `Through Pay App #${payAppNo ?? '-'}`, `${lines.length} line items | ${showMoney ? 'Dollar values included' : 'Quantities only'}`, 'A matching PDF copy is attached.'].filter(Boolean).join('\n\n')),
      pdfBase64: pdf.base64,
      pdfSize: pdf.size,
    };
  }

  const filename = `quantities-${clean(projectName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}.pdf`;
  return (
    <BrandedReportEmailDialog
      open={open}
      onOpenChange={onOpenChange}
      reportTitle={`Quantities & Progress | ${lines.length} line items`}
      projectName={projectName}
      filename={filename}
      defaultSubject={`${projectName} - Quantities & Progress`}
      projectId={projectId}
      sourceModule="quantities-progress"
      reportType="quantities_progress"
      prepareDelivery={prepareDelivery}
      dialogTitle="Email the client-ready quantities report"
      htmlDescription="The selected quantities are readable directly in the message."
      extraOptions={
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2.5">
          <div><p className="text-sm font-medium">Include dollar values</p><p className="text-xs text-muted-foreground">Turn off to share quantities only.</p></div>
          <div className="flex items-center gap-2"><Label htmlFor="quantities-email-money" className="sr-only">Include dollar values</Label><Switch id="quantities-email-money" checked={showMoney} onCheckedChange={setShowMoney} /></div>
        </div>
      }
    />
  );
}
