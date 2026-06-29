// Branded, print-ready prime↔sub Margin & Recovery report, opened in a new tab.
import type { MarginData, MarginCO } from '@/hooks/useMargin';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const signed = (n: number) => `${n < 0 ? '-' : '+'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const coLabel = (c: MarginCO | null) => c ? `${c.co_no != null ? '#' + c.co_no + ' · ' : ''}${esc(c.title)}` : '—';
const fmt = (ts: string) => { try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };

export function buildMarginReportHtml(d: MarginData, projectName: string): string {
  const pct = d.totals.revenue ? Math.round((d.totals.margin / d.totals.revenue) * 100) : 0;
  const TREAT: Record<string, string> = { markup: 'Markup', pass_through: 'Pass-through', apas_100: '100% APAS' };
  const coRows = d.classified.map(c => `<tr>
    <td>${coLabel(c.prime)}</td><td class="r">${usd(Number(c.prime.amount ?? 0))}</td>
    <td>${TREAT[c.treatment] ?? c.treatment}${c.sub_label ? ' · ' + esc(c.sub_label) : ''}</td>
    <td class="r">${c.treatment === 'apas_100' ? '—' : usd(c.sub_cost)}</td>
    <td class="r">${c.treatment === 'pass_through' ? '<span class="pt">$0</span>' : `<b style="color:${c.recovery >= 0 ? '#0F6E56' : '#A32D2D'}">${signed(c.recovery)}</b>`}</td></tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(projectName)} — Margin &amp; Recovery</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Georgia,'Times New Roman',serif;color:#1A1714;background:#fff;padding:36px 40px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C4A35A;padding-bottom:12px}
  .head h1{margin:0;font-size:22px}.head .sub{color:#6b7280;font-size:13px;margin-top:3px}.head .meta{text-align:right;font-size:12px;color:#6b7280}
  .stats{display:flex;gap:10px;margin:18px 0}
  .stat{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:11px;text-align:center}
  .stat .n{font-size:20px;font-weight:bold;line-height:1}.stat .l{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;margin-top:4px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#1558b0;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin:18px 0 8px}
  table{width:100%;border-collapse:collapse;font-family:-apple-system,Arial,sans-serif}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#9aa1ad;border-bottom:1px solid #ddd;padding:5px 8px}
  td{font-size:12.5px;border-bottom:1px solid #f1f1f1;padding:7px 8px}.r{text-align:right}
  .pt{font-size:10px;font-weight:bold;text-transform:uppercase;color:#6b7280;background:#f1efe8;padding:1px 8px;border-radius:10px}
  tfoot td{font-weight:bold;border-top:2px solid #ddd}
  .two{display:flex;gap:14px}.two>div{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
  .line{display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0}.line.b{border-top:1px solid #e5e7eb;margin-top:4px;padding-top:6px;font-weight:bold}
  @media print{body{padding:0}}
</style></head><body>
  <div class="head">
    <div><h1>${esc(projectName)}</h1><div class="sub">Margin &amp; Recovery — owner billings vs subcontractor costs</div></div>
    <div class="meta">Generated ${fmt(new Date().toISOString())}<br>Prepared by APAS Consulting</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="n">${usd(d.totals.revenue)}</div><div class="l">Owner revenue</div></div>
    <div class="stat"><div class="n">${usd(d.totals.cost)}</div><div class="l">Sub cost</div></div>
    <div class="stat"><div class="n" style="color:#0F6E56">${usd(d.totals.margin)}</div><div class="l">APAS recovery</div></div>
    <div class="stat"><div class="n">${pct}%</div><div class="l">Margin</div></div>
  </div>

  <h2>Base contract</h2>
  <table><tbody>
    <tr><td>Owner (prime contract)</td><td class="r">${usd(d.base.prime)}</td></tr>
    <tr><td>Sub (commitments)</td><td class="r">${usd(d.base.sub)}</td></tr>
    <tr><td><b>APAS margin on base</b></td><td class="r"><b style="color:#0F6E56">${signed(d.base.delta)}</b></td></tr>
  </tbody></table>

  <h2>Change orders</h2>
  ${coRows ? `<table>
    <thead><tr><th>Owner change order</th><th class="r">Bill</th><th>Treatment</th><th class="r">Sub cost</th><th class="r">APAS</th></tr></thead>
    <tbody>${coRows}</tbody>
    <tfoot><tr><td>Totals</td><td class="r">${usd(d.totals.coRevenue)}</td><td></td><td class="r">${usd(d.totals.coCost)}</td><td class="r" style="color:#0F6E56">${signed(d.totals.coMargin)}</td></tr></tfoot>
  </table>` : '<p style="color:#6b7280;font-size:12.5px">No classified change orders.</p>'}

  <h2>Cash position</h2>
  <div class="two">
    <div><div style="font-size:11px;text-transform:uppercase;color:#9aa1ad;font-weight:bold;margin-bottom:6px">Owner (A/R)</div>
      <div class="line"><span>Billed</span><span>${usd(d.cash.billedToOwner)}</span></div>
      <div class="line"><span>Received</span><span>${usd(d.cash.receivedFromOwner)}</span></div>
      <div class="line b"><span>Outstanding</span><span>${usd(d.cash.billedToOwner - d.cash.receivedFromOwner)}</span></div></div>
    <div><div style="font-size:11px;text-transform:uppercase;color:#9aa1ad;font-weight:bold;margin-bottom:6px">Subs (A/P)</div>
      <div class="line"><span>Committed</span><span>${usd(d.cash.committed)}</span></div>
      <div class="line"><span>Paid to subs</span><span>${usd(d.cash.paidToSubs)}</span></div>
      <div class="line b"><span>Owed to subs</span><span>${usd(d.cash.owedToSubs)}</span></div></div>
  </div>
</body></html>`;
}

export function openMarginReport(d: MarginData, projectName: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open(); w.document.write(buildMarginReportHtml(d, projectName)); w.document.close();
}
