// Branded HTML for a single action item — used for both Print and Email so they
// always match. Inline styles only (email-client safe).

export interface TaskDocInput {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assigneeName?: string | null;
  projectName?: string;
  scopeName?: string | null;
  note?: string | null;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const label = (s?: string | null) =>
  (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (s?: string | null) =>
  s ? new Date(s + (s.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export function buildTaskHtml(input: TaskDocInput): string {
  const rows: Array<[string, string]> = [
    ['Owner', input.assigneeName || 'Unassigned'],
    ['Due', fmtDate(input.dueDate)],
    ['Status', label(input.status) || 'To do'],
    ['Priority', label(input.priority) || 'Medium'],
  ];
  if (input.scopeName) rows.push(['Scope', input.scopeName]);

  const rowsHtml = rows.map(
    ([k, v]) => `<tr>
      <td style="padding:6px 12px 6px 0;color:#878581;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
      <td style="padding:6px 0;color:#1A1714;font-size:14px;font-weight:500;">${esc(v)}</td>
    </tr>`,
  ).join('');

  return `<!doctype html><html><body style="margin:0;background:#FDFCF9;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1714;">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Action item${input.projectName ? ` · ${esc(input.projectName)}` : ''}</div>
    <h1 style="font-size:22px;line-height:1.25;margin:6px 0 16px;font-weight:700;">${esc(input.title)}</h1>
    ${input.description ? `<p style="font-size:14px;line-height:1.6;color:#3d3a36;margin:0 0 18px;">${esc(input.description)}</p>` : ''}
    <table style="border-collapse:collapse;margin:0 0 8px;">${rowsHtml}</table>
    ${input.note ? `<div style="margin-top:18px;padding:14px 16px;background:#FAF8F4;border-left:3px solid #1D6FE8;border-radius:0 8px 8px 0;">
      <div style="font-size:12px;color:#878581;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Note</div>
      <div style="font-size:14px;line-height:1.6;color:#1A1714;white-space:pre-wrap;">${esc(input.note)}</div>
    </div>` : ''}
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #eceae4;font-size:12px;color:#a8a49c;">Sent from projOS · projos.ai</div>
  </div></body></html>`;
}

/** Open a print window with the task document. */
export function printTaskHtml(html: string) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 300);
}
