// Branded, print-ready AIA G702/G703 for a vendor pay-app submission.
import type { VendorPayApp } from '@/hooks/useVendorPayApps';

interface G703Line { description: string; scheduled_value: number; from_previous: number; this_period: number; materials: number }
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (ts?: string | null) => { if (!ts) return ''; try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };

export function buildVendorPayAppReportHtml(s: VendorPayApp & { lines?: G703Line[]; retainage_pct?: number; prior_payments?: number; retainage_amount?: number; conditional_signed_at?: string | null }, opts: { projectName: string; commitmentTitle?: string }): string {
  const lines: G703Line[] = Array.isArray(s.lines) ? s.lines : [];
  const total = Number(s.total_completed ?? 0);
  const ret = Number(s.retainage_amount ?? 0);
  const prior = Number(s.prior_payments ?? 0);
  const due = Number(s.current_due ?? total - ret - prior);
  const rows = lines.map((l, i) => {
    const completed = Number(l.from_previous || 0) + Number(l.this_period || 0) + Number(l.materials || 0);
    const pct = l.scheduled_value ? Math.round((completed / Number(l.scheduled_value)) * 100) : 0;
    const bal = Number(l.scheduled_value || 0) - completed;
    return `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td class="r">${usd(l.scheduled_value)}</td><td class="r">${usd(l.from_previous)}</td><td class="r">${usd(l.this_period)}</td><td class="r">${usd(l.materials)}</td><td class="r">${usd(completed)}</td><td class="r">${pct}%</td><td class="r">${usd(bal)}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(s.vendor_name || 'Vendor')} — Pay Application</title>
<style>
  *{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;color:#1A1714;padding:34px 38px;background:#fff}
  .head{display:flex;justify-content:space-between;border-bottom:3px solid #C4A35A;padding-bottom:10px}
  .head h1{margin:0;font-size:20px}.head .sub{color:#6b7280;font-size:13px;margin-top:3px}.head .meta{text-align:right;font-size:12px;color:#6b7280}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#1558b0;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin:18px 0 8px}
  table{width:100%;border-collapse:collapse;font-family:-apple-system,Arial,sans-serif}
  th{font-size:9.5px;text-transform:uppercase;color:#9aa1ad;border-bottom:1px solid #ddd;padding:5px 6px;text-align:left}
  td{font-size:11.5px;border-bottom:1px solid #f1f1f1;padding:6px}.r{text-align:right}
  .sum{width:300px;margin-left:auto}.sum .line{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}.sum .b{border-top:2px solid #ddd;margin-top:4px;padding-top:6px;font-weight:bold}
  .sign{margin-top:20px;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:12px;color:#374151}
  @media print{body{padding:0}}
</style></head><body>
  <div class="head">
    <div><h1>Application for Payment</h1><div class="sub">AIA G702 / G703 · ${esc(opts.projectName)}${opts.commitmentTitle ? ' · ' + esc(opts.commitmentTitle) : ''}</div></div>
    <div class="meta">From: <b>${esc(s.vendor_name || 'Vendor')}</b><br>Application #${s.app_no ?? '—'}<br>Submitted ${fmt(s.submitted_at)}</div>
  </div>

  <h2>Continuation sheet (G703)</h2>
  <table>
    <thead><tr><th>#</th><th>Description of work</th><th class="r">Scheduled</th><th class="r">From previous</th><th class="r">This period</th><th class="r">Materials</th><th class="r">Completed</th><th class="r">%</th><th class="r">Balance</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="9" style="color:#6b7280;text-align:center;padding:12px">No lines.</td></tr>'}</tbody>
  </table>

  <h2>Application summary (G702)</h2>
  <div class="sum">
    <div class="line"><span>Total completed &amp; stored</span><span>${usd(total)}</span></div>
    <div class="line"><span>Less retainage (${Number(s.retainage_pct ?? 0)}%)</span><span>(${usd(ret)})</span></div>
    <div class="line"><span>Total earned less retainage</span><span>${usd(total - ret)}</span></div>
    <div class="line"><span>Less previous payments</span><span>${usd(prior)}</span></div>
    <div class="line b"><span>Current payment due</span><span>${usd(due)}</span></div>
  </div>

  <div class="sign">
    <b>Conditional waiver &amp; release on progress payment</b> — signed electronically by
    <b>${esc(s.conditional_signed_name || '—')}</b> on ${fmt(s.conditional_signed_at)}. Conditional upon receipt of ${usd(due)}.
  </div>
</body></html>`;
}

export function openVendorPayAppReport(s: any, opts: { projectName: string; commitmentTitle?: string }) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open(); w.document.write(buildVendorPayAppReportHtml(s, opts)); w.document.close();
}
