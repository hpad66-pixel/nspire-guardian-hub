// Branded, corporate meeting-agenda document — used for both the print view and
// the email body. Inline styles only (email-client safe). Co-branded EPPIS AI ×
// APAS AI, grouped by AI-assigned topic.

export interface AgendaDocItem {
  title: string;
  description?: string | null;
  ownerName?: string | null;
  due?: string | null;
  category?: string | null; // overdue | due | open | objective | decision | next_step | update | discussion
  discussed?: boolean;
}

export interface AgendaDocGroup {
  topic: string;
  items: AgendaDocItem[];
}

export interface AgendaDocInput {
  projectName?: string;
  title: string;
  date?: string | null;
  attendees?: string | null;
  groups: AgendaDocGroup[];
  brandPrimary?: string;   // lead firm wordmark
  brandPowered?: string;   // powering platform wordmark
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtDate = (s?: string | null) =>
  s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

const fmtShort = (s?: string | null) =>
  s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

// urgency chip color + label
const CHIP: Record<string, { bg: string; fg: string; label: string }> = {
  overdue:   { bg: '#FEE9EC', fg: '#B4283C', label: 'Overdue' },
  due:       { bg: '#FEF3E2', fg: '#B4740C', label: 'Due soon' },
  decision:  { bg: '#F5EEDD', fg: '#8A6B22', label: 'Decision' },
  next_step: { bg: '#E6F7F0', fg: '#0B8A5E', label: 'Next step' },
  objective: { bg: '#E8F1FE', fg: '#1257C0', label: 'Objective' },
  update:    { bg: '#F1F0EC', fg: '#6B6862', label: 'Update' },
};

export function buildAgendaHtml(input: AgendaDocInput): string {
  const primary = input.brandPrimary || 'EPPIS AI';
  const powered = input.brandPowered || 'APAS AI';

  let n = 0;
  const groupsHtml = input.groups.map((g) => {
    const rows = g.items.map((it) => {
      n += 1;
      const chip = it.category ? CHIP[it.category] : undefined;
      const chipHtml = chip
        ? `<span style="display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${chip.fg};background:${chip.bg};border-radius:999px;padding:2px 8px;margin-left:8px;vertical-align:middle;">${chip.label}</span>`
        : '';
      const meta = [it.ownerName ? `Owner: ${esc(it.ownerName)}` : '', it.due ? `Due ${fmtShort(it.due)}` : '']
        .filter(Boolean).join(' &nbsp;·&nbsp; ');
      return `<tr>
        <td style="width:26px;vertical-align:top;padding:11px 0 11px 0;color:#C4A35A;font-weight:700;font-size:13px;">${n}.</td>
        <td style="vertical-align:top;padding:11px 0;border-bottom:1px solid #efece5;">
          <div style="font-size:14.5px;font-weight:600;color:#1A1714;line-height:1.4;">${esc(it.title)}${chipHtml}</div>
          ${it.description ? `<div style="font-size:13px;color:#4a4640;line-height:1.55;margin-top:3px;">${esc(it.description)}</div>` : ''}
          ${meta ? `<div style="font-size:12px;color:#8a877f;margin-top:4px;">${meta}</div>` : ''}
        </td>
      </tr>`;
    }).join('');
    return `<div style="margin-top:22px;">
      <div style="font-size:12.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#1A1714;border-left:3px solid #C4A35A;padding-left:10px;">${esc(g.topic)}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:6px;">${rows}</table>
    </div>`;
  }).join('');

  const subline = [fmtDate(input.date), input.attendees ? `Attendees: ${esc(input.attendees)}` : '']
    .filter(Boolean).join(' &nbsp;·&nbsp; ');

  return `<div style="max-width:680px;margin:0 auto;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A1714;background:#ffffff;">
    <!-- co-brand band -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="font-family:Georgia,'Playfair Display',serif;font-size:19px;font-weight:700;letter-spacing:.02em;color:#1A1714;">${esc(primary)}</td>
        <td style="text-align:right;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a877f;">Powered by <span style="color:#1A1714;font-weight:700;">${esc(powered)}</span></td>
      </tr>
    </table>
    <div style="height:3px;background:linear-gradient(90deg,#C4A35A,#C4A35A 40%,#e7ded0);border-radius:2px;margin:10px 0 0;"></div>

    <!-- title block -->
    <div style="margin-top:24px;">
      <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#C4A35A;font-weight:800;">Meeting Agenda${input.projectName ? ` &nbsp;·&nbsp; ${esc(input.projectName)}` : ''}</div>
      <h1 style="font-size:25px;margin:8px 0 4px;font-weight:800;line-height:1.2;">${esc(input.title)}</h1>
      ${subline ? `<div style="font-size:13.5px;color:#8a877f;">${subline}</div>` : ''}
    </div>

    ${groupsHtml || '<div style="margin-top:24px;color:#8a877f;font-size:14px;">No agenda items yet.</div>'}

    <div style="margin-top:30px;padding-top:14px;border-top:1px solid #efece5;font-size:11.5px;color:#a8a49c;display:flex;justify-content:space-between;">
      <span>${esc(primary)} &nbsp;·&nbsp; Powered by ${esc(powered)}</span>
      <span>projos.ai</span>
    </div>
  </div>`;
}
