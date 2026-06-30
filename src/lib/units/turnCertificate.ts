// Branded, print-ready "Unit Turn Certificate" — proof a unit turn was inspected,
// all findings addressed, signed off, and closed. Opens in a new tab to print/PDF.
import { buildingKey, buildingColor } from '@/lib/units/building';
import type { UnitTurn, TurnLogEntry } from '@/hooks/useUnitTurns';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (ts?: string | null) => { if (!ts) return '—'; try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; } };
const KIND_LABEL: Record<string, string> = {
  turn_started: 'Turn opened', vacated: 'Unit vacated', inspection_triggered: 'NSPIRE inspection started',
  inspection_deferred: 'Inspection deferred', inspection_done: 'Inspection completed', finding_addressed: 'Finding addressed',
  equipment: 'Equipment repaired / replaced', document: 'Document uploaded', signed_off: 'Signed off', closed: 'Turn closed', note: 'Note',
};

export function buildTurnCertificateHtml(d: { turn: UnitTurn; log: TurnLogEntry[]; unitNumber: string; propertyName: string }): string {
  const bk = buildingKey(d.unitNumber);
  const col = buildingColor(bk);
  const rows = d.log.map((l) => `<tr>
      <td class="dt">${fmt(l.created_at)}</td>
      <td><b>${esc(KIND_LABEL[l.kind] ?? l.kind)}</b>${l.body ? ` — ${esc(l.body)}` : ''}${l.actor_name ? ` <span class="who">(${esc(l.actor_name)})</span>` : ''}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unit Turn Certificate — Unit ${esc(d.unitNumber)}</title>
<style>
  *{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;color:#1A1714;padding:40px;background:#fff}
  .cert{max-width:760px;margin:0 auto;border:2px solid ${col.bg};border-radius:14px;padding:32px 36px}
  .head{display:flex;align-items:center;gap:14px;border-bottom:2px solid #eee;padding-bottom:16px}
  .badge{width:56px;height:56px;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:20px;background:${col.bg};color:${col.fg}}
  h1{margin:0;font-size:22px}.sub{color:#6b7280;font-size:13px;margin-top:3px}
  .seal{margin-left:auto;text-align:center;color:#0F6E56}.seal .ring{width:64px;height:64px;border:3px solid #0F6E56;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;text-transform:uppercase;line-height:1.1}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;margin:20px 0}
  .f{font-size:13px}.f .k{color:#9aa1ad;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px}.f .v{font-weight:700}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#1558b0;border-bottom:1px solid #eee;padding-bottom:5px;margin:22px 0 8px}
  table{width:100%;border-collapse:collapse;font-family:-apple-system,Arial,sans-serif}
  td{font-size:12px;border-bottom:1px solid #f1f1f1;padding:6px 6px;vertical-align:top}.dt{white-space:nowrap;color:#6b7280;width:120px}.who{color:#9aa1ad}
  .foot{margin-top:22px;display:flex;justify-content:space-between;font-size:12px;color:#374151}
  .sig{border-top:1px solid #ccc;padding-top:6px;width:260px;text-align:center}
  @media print{body{padding:0}.cert{border:none}}
</style></head><body>
  <div class="cert">
    <div class="head">
      <div class="badge">${esc(bk)}</div>
      <div>
        <h1>Unit Turn Certificate</h1>
        <div class="sub">${esc(d.propertyName)} · Building ${esc(bk)} · Unit ${esc(d.unitNumber)}</div>
      </div>
      ${d.turn.status === 'closed' ? `<div class="seal"><div class="ring">Reconciled · QC<br>Checked</div></div>` : ''}
    </div>

    <div class="grid">
      <div class="f"><div class="k">Vacated</div><div class="v">${fmt(d.turn.vacated_at)}</div></div>
      <div class="f"><div class="k">Turned over</div><div class="v">${fmt(d.turn.turned_over_at)}</div></div>
      <div class="f"><div class="k">Inspection completed</div><div class="v">${fmt(d.turn.inspection_done_at)}</div></div>
      <div class="f"><div class="k">Findings</div><div class="v">${d.turn.findings_count} ${d.turn.findings_addressed ? '· all addressed' : ''}</div></div>
      <div class="f"><div class="k">Turn closed</div><div class="v">${fmt(d.turn.closed_at)}</div></div>
      <div class="f"><div class="k">Trigger</div><div class="v">${esc((d.turn.trigger_source || '').replace(/_/g, ' '))}</div></div>
    </div>

    <h2>Audit log</h2>
    <table><tbody>${rows || '<tr><td colspan="2" style="color:#6b7280;padding:12px;text-align:center">No log entries.</td></tr>'}</tbody></table>

    <div class="foot">
      <div class="sig">Signed off${d.turn.status === 'closed' ? '' : ' (pending)'}</div>
      <div class="sig">Date: ${fmt(d.turn.closed_at)}</div>
    </div>
  </div>
</body></html>`;
}

export function openTurnCertificate(d: { turn: UnitTurn; log: TurnLogEntry[]; unitNumber: string; propertyName: string }) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open(); w.document.write(buildTurnCertificateHtml(d)); w.document.close();
}
