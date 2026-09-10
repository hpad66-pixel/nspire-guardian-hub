export interface MeetingSection {
    heading: string;
    text: string;
    basis: 'verified' | 'interpretation' | 'needs_review';
}
export interface MeetingSnapshot {
    title: string;
    meeting_date: string;
    client_name: string;
    attendees: string;
    project_ids: string[];
    sections: MeetingSection[];
    actions: Array<{
        id: string;
        title: string;
        project: string;
        assignee: string;
        ball_in_court: string;
        due_date: string | null;
        state: string;
        step: number;
    }>;
}
export const escapeMeetingText = (s: unknown) => String(s ?? '').replace(/[\u2013\u2014]/g, '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function meetingReportHtml(s: MeetingSnapshot, portalUrl: string, message = ''): string {
    const e = escapeMeetingText;
    const blocks = s.sections.map((x, i) => `<section style="margin:26px 0"><h2 style="font-size:21px;color:#123d30;margin:0 0 10px">${String(i + 1).padStart(2, '0')} / ${e(x.heading)}</h2><p style="white-space:pre-wrap;margin:0 0 9px">${e(x.text)}</p><small style="color:#596e63">${x.basis === 'verified' ? 'Human-reviewed facts' : x.basis === 'interpretation' ? 'Interpretation / recommendation' : 'Needs verification'}</small></section>`).join('');
    const actions = s.actions.map(a => `<tr><td style="padding:12px 8px;border-bottom:1px solid #dce4dc"><b>${e(a.title)}</b><br><small>${e(a.project)}</small></td><td style="padding:12px 8px;border-bottom:1px solid #dce4dc">${e(a.assignee || 'Unassigned')}<br><small>Ball in court: ${e(a.ball_in_court || 'To confirm')}</small></td><td style="padding:12px 8px;border-bottom:1px solid #dce4dc">${e(a.due_date || 'Not agreed')}<br><small>${['closed', 'approved'].includes(a.state) ? 'Confirmed complete' : a.step === 2 ? 'Completion review' : 'Open'}</small></td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;color:#193d30;background:#f5f5ef;font:16px/1.6 Arial,sans-serif}.report{max-width:780px;margin:auto;background:white;padding:36px}h1{font:32px/1.2 Georgia,serif}h2,h3{break-after:avoid}p,tr{break-inside:avoid}table{border-collapse:collapse;width:100%;font-size:14px}th{text-align:left;padding:8px;background:#eef3ed}a{color:#174b38}@media(max-width:500px){.report{padding:18px}table{font-size:12px}}@media print{body{background:white}}</style></head><body><main class="report"><header style="border-top:5px solid #b39147;padding-top:22px"><div style="font-size:12px;letter-spacing:2px;color:#617368">APAS CONSULTING</div><h1>${e(s.title)}</h1><p>${e(s.client_name)} · ${e(s.meeting_date)}</p><p style="font-size:13px;color:#617368">Participants: ${e(s.attendees || 'Not recorded')}</p></header>${message ? `<p style="padding:16px;background:#f6efd9;white-space:pre-wrap">${e(message)}</p>` : ''}<article class="meeting-report-body">${blocks}<h2>Action register</h2><table><thead><tr><th>Action / project</th><th>Responsibility</th><th>Due / status</th></tr></thead><tbody>${actions || '<tr><td colspan="3">No actions recorded.</td></tr>'}</tbody></table></article><footer style="margin-top:32px;padding-top:18px;border-top:1px solid #dce4dc"><a href="${e(portalUrl)}">Open Meetings &amp; Actions to provide an update</a><p style="font-size:12px;color:#617368">This is a dated report snapshot. Current action progress and subsequent updates are available in your secure client portal.</p></footer></main></body></html>`;
}
export function meetingScheduleDue(s: {
    weekday: number;
    hour: number;
    timezone: string;
}, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: s.timezone, weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find(p => p.type === 'weekday')?.value || '') === s.weekday && Number(parts.find(p => p.type === 'hour')?.value) === s.hour;
}
export function parseMeetingDraft(raw: string, allowedProjects: string[], transcript: string) {
    const v = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim());
    if (typeof v.title !== 'string' || !Array.isArray(v.sections) || !Array.isArray(v.actions))
        throw new Error('AI returned an incomplete draft. Your saved report was not changed.');
    const sections: MeetingSection[] = v.sections.map((x: Record<string, unknown>) => {
        if (typeof x.heading !== 'string' || typeof x.text !== 'string')
            throw new Error('AI returned an invalid section');
        return { heading: x.heading, text: x.text, basis: 'needs_review' };
    });
    const actions = v.actions.map((x: Record<string, unknown>) => {
        if (typeof x.title !== 'string' || !x.title.trim())
            throw new Error('AI returned an invalid action');
        const source_quote = typeof x.source_quote === 'string' ? x.source_quote : '';
        return { title: x.title, project_id: allowedProjects.includes(String(x.project_id)) ? x.project_id : '', assignee_name: String(x.assignee_name || ''), ball_in_court: String(x.ball_in_court || ''), due_date: '', source_quote: source_quote && transcript.includes(source_quote) ? source_quote : '', source_locator: String(x.source_locator || '') };
    });
    return { title: v.title, sections, actions };
}
