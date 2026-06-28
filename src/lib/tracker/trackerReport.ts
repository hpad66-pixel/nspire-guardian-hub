// Builds a self-contained, branded, print-ready Project Log report and opens it
// in a new tab (so it prints clean, with no app chrome). Grouped by subcontractor,
// status, or category; optionally open-items only.
import type { TrackerItem } from '@/hooks/useTracker';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open', progress: 'In progress', scheduled: 'Scheduled', blocked: 'Blocked', done: 'Done',
};
const STATUS_COLOR: Record<string, string> = {
  open: '#6b7280', progress: '#1558b0', scheduled: '#5e35b1', blocked: '#c62828', done: '#1e7e34',
};
const PRI_LABEL: Record<string, string> = { high: 'High', med: 'Med', low: 'Low' };
const STATUS_ORDER = ['blocked', 'progress', 'scheduled', 'open', 'done'];

export type ReportGroupBy = 'owner' | 'status' | 'category';
export interface ReportOptions { groupBy: ReportGroupBy; openOnly: boolean; projectName: string; preparedBy?: string }

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (ts?: string | null) => { if (!ts) return ''; try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };

export function buildTrackerReportHtml(items: TrackerItem[], opts: ReportOptions): string {
  const scoped = opts.openOnly ? items.filter(i => i.status !== 'done') : items;
  const counts: Record<string, number> = { open: 0, progress: 0, scheduled: 0, blocked: 0, done: 0 };
  items.forEach(i => { counts[i.status] = (counts[i.status] ?? 0) + 1; });

  const keyFor = (i: TrackerItem) =>
    opts.groupBy === 'owner' ? (i.owner || 'Unassigned')
    : opts.groupBy === 'category' ? (i.category || 'general')
    : i.status;
  const groups: Record<string, TrackerItem[]> = {};
  scoped.forEach(i => { (groups[keyFor(i)] ??= []).push(i); });
  const groupKeys = Object.keys(groups).sort((a, b) =>
    opts.groupBy === 'status' ? STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b) : a.localeCompare(b));

  const groupTitle = (k: string) => opts.groupBy === 'status' ? (STATUS_LABEL[k] ?? k) : k;

  const rows = (g: TrackerItem[]) => g
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }))
    .map(i => {
      const last = i.updates[0];
      return `<tr>
        <td class="code">${esc(i.code || '')}</td>
        <td><div class="t">${esc(i.title)}</div>${last ? `<div class="note">${fmt(last.created_at)} · ${esc(last.author || '')}: ${esc(last.body)}</div>` : ''}</td>
        <td>${esc(i.owner || '—')}</td>
        <td><span class="pill" style="color:${STATUS_COLOR[i.status]};border-color:${STATUS_COLOR[i.status]}33;background:${STATUS_COLOR[i.status]}14">${STATUS_LABEL[i.status] ?? i.status}</span></td>
        <td>${PRI_LABEL[i.priority] ?? i.priority}</td>
      </tr>`;
    }).join('');

  const sections = groupKeys.map(k => `
    <section>
      <h2>${esc(groupTitle(k))} <span class="ct">${groups[k].length}</span></h2>
      <table><thead><tr><th>Code</th><th>Item</th><th>Owner</th><th>Status</th><th>Priority</th></tr></thead>
      <tbody>${rows(groups[k])}</tbody></table>
    </section>`).join('');

  const summary = (['done', 'progress', 'scheduled', 'blocked', 'open'] as const)
    .map(s => `<div class="stat"><div class="n" style="color:${STATUS_COLOR[s]}">${counts[s]}</div><div class="l">${STATUS_LABEL[s]}</div></div>`).join('');

  const total = items.length;
  const pct = total ? Math.round((counts.done / total) * 100) : 0;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(opts.projectName)} — Project Log Report</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Georgia,'Times New Roman',serif;color:#1A1714;background:#fff;padding:36px 40px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C4A35A;padding-bottom:12px}
  .head h1{margin:0;font-size:22px}
  .head .sub{color:#6b7280;font-size:13px;margin-top:3px}
  .head .meta{text-align:right;font-size:12px;color:#6b7280}
  .stats{display:flex;gap:10px;margin:18px 0 6px}
  .stat{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}
  .stat .n{font-size:22px;font-weight:bold;line-height:1}
  .stat .l{font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;margin-top:4px}
  .prog{font-size:12px;color:#6b7280;margin-bottom:18px}
  section{margin-bottom:18px;break-inside:avoid}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#1558b0;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin:0 0 8px;display:flex;align-items:center;gap:8px}
  h2 .ct{background:#F3EFE6;color:#6b5a2a;font-size:11px;padding:1px 8px;border-radius:10px}
  table{width:100%;border-collapse:collapse;font-family:-apple-system,Arial,sans-serif}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#9aa1ad;border-bottom:1px solid #ddd;padding:5px 8px}
  td{font-size:12px;border-bottom:1px solid #f1f1f1;padding:7px 8px;vertical-align:top}
  td.code{font-weight:bold;color:#6b7280;width:42px}
  td .t{font-weight:600}
  td .note{font-size:11px;color:#6b7280;margin-top:2px;font-style:italic}
  .pill{font-size:10px;font-weight:bold;text-transform:uppercase;padding:1px 8px;border-radius:10px;border:1px solid;white-space:nowrap}
  .foot{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:11px;color:#9aa1ad}
  @media print{body{padding:0}.noprint{display:none}}
</style></head><body>
  <div class="head">
    <div><h1>${esc(opts.projectName)}</h1><div class="sub">Project Log Report${opts.openOnly ? ' · open items' : ''} · grouped by ${opts.groupBy === 'owner' ? 'subcontractor' : opts.groupBy}</div></div>
    <div class="meta">Generated ${fmt(new Date().toISOString())}${opts.preparedBy ? `<br>Prepared by ${esc(opts.preparedBy)}` : ''}</div>
  </div>
  <div class="stats">${summary}</div>
  <div class="prog">${pct}% complete · ${counts.done} of ${total} closed</div>
  ${sections || '<p style="color:#6b7280">No items to report.</p>'}
  <div class="foot">Project Log · ${esc(opts.projectName)} · maintained in Proj OS</div>
</body></html>`;
}

export function openTrackerReport(items: TrackerItem[], opts: ReportOptions) {
  const html = buildTrackerReportHtml(items, opts);
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
