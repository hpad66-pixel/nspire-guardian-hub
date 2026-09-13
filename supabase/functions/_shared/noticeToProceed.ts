export interface NoticeDraft {
  agreement_reference: string; agreement_approved_on: string; agreement_confirmed: boolean; commitment_id?: string;
  scope_of_work: string; start_date: string; completion_date: string; budget_cents: number | null;
  prerequisites_confirmed: boolean; instructions: string; recipient_email: string; cc_emails: string[]; bcc_emails: string[];
}
export interface NoticeRecord extends NoticeDraft {
  id: string; case_id: string; status: 'draft' | 'issued'; issued_at?: string; delivery_status?: string;
  snapshot?: { company_name?: string; project_name?: string; client_name?: string; branding?: Record<string, string | null> };
}
const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\u2014/g, ', ');
export const noticeMoney = (cents: number | null) => cents === null ? 'To be confirmed' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export function noticeChecks(n: NoticeDraft, qualified: boolean) {
  return [
    { label: 'Onboarding', ready: qualified, detail: 'Selected requirements and existing evidence approved' },
    { label: 'Agreement', ready: n.agreement_confirmed && !!n.agreement_reference.trim() && !!n.agreement_approved_on && n.agreement_approved_on <= new Date().toISOString().slice(0,10), detail: 'Approved contract or proposal on file' },
    { label: 'Scope', ready: !!n.scope_of_work.trim(), detail: 'Work and deliverables clearly defined' },
    { label: 'Schedule', ready: !!n.start_date && !!n.completion_date && n.completion_date >= n.start_date, detail: 'Start and completion dates confirmed' },
    { label: 'Budget', ready: Number.isSafeInteger(n.budget_cents) && (n.budget_cents ?? -1) >= 0, detail: 'Authorized amount confirmed' },
  ];
}
export function noticeLetter(n: NoticeRecord): string {
  const s = n.snapshot ?? {}; const b = s.branding ?? {};
  const block = (title: string, body: string) => `<section style="margin:24px 0"><h2 style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#16775f;margin:0 0 8px">${title}</h2><div style="white-space:pre-wrap;line-height:1.7">${esc(body)}</div></section>`;
  return `<article style="max-width:720px;margin:auto;background:white;color:#15332b;font:16px/1.65 Arial,sans-serif;padding:36px;box-sizing:border-box">
    <header style="border-bottom:3px solid #c4a35a;padding-bottom:20px"><div style="font-size:25px;font-weight:800;color:#092d25">${esc(b.company_name || 'APAS Consulting')}</div><div style="font-size:12px;color:#63766d">${esc([b.address_line1,b.address_line2,b.phone,b.email].filter(Boolean).join(' · '))}</div></header>
    <div style="margin-top:25px;font-size:11px;letter-spacing:2px;color:#16775f;font-weight:bold">${n.status === 'issued' ? 'AUTHORIZED TO PROCEED' : 'DRAFT FOR REVIEW'}</div><h1 style="font-size:30px;letter-spacing:-1px;margin:8px 0 20px">Notice to Proceed</h1>
    <p><b>To:</b> ${esc(s.company_name)}<br><b>Project:</b> ${esc(s.project_name)}${s.client_name ? `<br><b>Client:</b> ${esc(s.client_name)}` : ''}<br><b>Reference:</b> NTP-${esc(n.id.slice(0,8).toUpperCase())}<br><b>Issued:</b> ${esc(n.issued_at?.slice(0,10) || 'Pending approval')}</p>
    <p>${n.status === 'issued' ? 'You are authorized to proceed with the work below under the approved agreement.' : 'This draft will authorize the work below once all release checks are complete and the notice is issued.'}</p>
    ${block('Approved agreement',`${n.agreement_reference}\nApproved on ${n.agreement_approved_on || 'To be confirmed'}`)}
    ${block('Authorized scope',n.scope_of_work)}
    <table style="width:100%;border-collapse:collapse;background:#f1f6f3"><tr>${[['Start',n.start_date],['Complete by',n.completion_date],['Authorized budget',noticeMoney(n.budget_cents)]].map(([label,value]) => `<td style="padding:15px;border:1px solid #dbe6df"><div style="font-size:11px;color:#5c7265">${label}</div><b>${esc(value || 'To be confirmed')}</b></td>`).join('')}</tr></table>
    ${n.instructions ? block('Coordination and conditions',n.instructions) : ''}
    <p style="margin-top:24px">Proceed only within this scope and authorized budget. Obtain written approval before any change to scope, price, or completion date. The approved agreement governs the work.</p>
    <p>We look forward to a successful project together.<br><b>${esc(b.company_name || 'APAS Consulting')}</b></p>
    <footer style="margin-top:30px;border-top:1px solid #dbe6df;padding-top:12px;color:#63766d;font-size:11px">${esc(b.footer_text || 'Project delivery, clearly authorized.')} · ${esc(s.project_name)}</footer>
  </article>`;
}
