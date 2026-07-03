// Branded meeting-recap document rendered as the EMAIL BODY (not an attachment).
// Inline styles only (email-client safe).

export interface RecapItem {
  title: string;
  description?: string | null;
  ownerName?: string | null;
  due?: string | null;
  priority?: string | null;
}

export interface RecapInput {
  projectName?: string;
  title: string;
  date?: string | null;
  attendees?: string | null;
  minutesHtml?: string | null;
  items: RecapItem[];
  transcript?: string | null;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtDate = (s?: string | null) =>
  s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

const PRIO: Record<string, string> = { urgent: '#F43F5E', high: '#F59E0B', medium: '#1D6FE8', low: '#878581' };

export function buildMeetingRecapHtml(input: RecapInput): string {
  const itemsHtml = input.items.length
    ? `<ul style="list-style:none;padding:0;margin:0;">${input.items.map((it) => {
        const dot = PRIO[String(it.priority ?? 'medium')] ?? PRIO.medium;
        const meta = [it.ownerName ? `Owner: ${esc(it.ownerName)}` : '', it.due ? `Due ${fmtDate(it.due)}` : '']
          .filter(Boolean).join(' · ');
        return `<li style="padding:12px 0;border-bottom:1px solid #eceae4;">
          <div style="display:flex;align-items:flex-start;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dot};margin:6px 10px 0 0;flex:0 0 auto;"></span>
            <div>
              <div style="font-size:15px;font-weight:500;color:#1A1714;">${esc(it.title)}</div>
              ${it.description ? `<div style="font-size:13.5px;color:#3d3a36;line-height:1.55;margin-top:2px;">${esc(it.description)}</div>` : ''}
              ${meta ? `<div style="font-size:12.5px;color:#878581;margin-top:3px;">${meta}</div>` : ''}
            </div>
          </div>
        </li>`;
      }).join('')}</ul>`
    : `<p style="color:#878581;font-size:14px;">No action items.</p>`;

  const transcriptHtml = input.transcript?.trim()
    ? `<h3 style="font-size:15px;margin:26px 0 8px;color:#1A1714;">Full transcript</h3>
       <div style="font-size:12.5px;line-height:1.6;color:#5f5c57;white-space:pre-wrap;background:#FAF8F4;border:1px solid #eceae4;border-radius:8px;padding:14px 16px;">${esc(input.transcript.trim())}</div>`
    : '';

  return `<div style="max-width:660px;margin:0 auto;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A1714;line-height:1.6;">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Meeting recap${input.projectName ? ` · ${esc(input.projectName)}` : ''}</div>
    <h1 style="font-size:24px;margin:6px 0 4px;font-weight:700;">${esc(input.title)}</h1>
    <div style="font-size:13.5px;color:#878581;margin-bottom:20px;">${[fmtDate(input.date), input.attendees ? `Attendees: ${esc(input.attendees)}` : ''].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>

    ${input.minutesHtml?.trim() ? `<h3 style="font-size:16px;margin:0 0 6px;color:#1A1714;">Summary</h3><div style="font-size:14.5px;">${input.minutesHtml}</div>` : ''}

    <h3 style="font-size:16px;margin:24px 0 6px;color:#1A1714;">Action items</h3>
    ${itemsHtml}

    ${transcriptHtml}

    <div style="margin-top:26px;padding-top:12px;border-top:1px solid #eceae4;font-size:12px;color:#a8a49c;">Sent from projOS · projos.ai</div>
  </div>`;
}
