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
const brandValue = (b: Record<string, string | null>, key: string, fallback: string) => {
  const value = b[key]?.trim();
  return value || fallback;
};
const safeColor = (value: string | null | undefined, fallback: string) => /^#[0-9a-f]{6}$/i.test(value ?? '') ? value! : fallback;
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
  const primary = safeColor(b.primary_color, '#082b23');
  const secondary = safeColor(b.secondary_color, '#c4a35a');
  const company = brandValue(b, 'company_name', 'APAS Consulting');
  const email = brandValue(b, 'email', 'hardeep@apas.ai');
  const contact = [b.address_line1, b.address_line2, b.phone, email, b.website].filter(Boolean).join(' | ');
  const block = (title: string, body: string) => `<section style="margin:24px 0"><h2 style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${primary};margin:0 0 8px">${title}</h2><div style="white-space:pre-wrap;line-height:1.7">${esc(body)}</div></section>`;
  return `<article style="max-width:760px;margin:auto;background:white;color:#15332b;font:16px/1.65 Arial,sans-serif;padding:0;box-sizing:border-box;border:1px solid #dbe6df">
    <header style="background:${primary};color:white;padding:28px 34px 24px;border-bottom:6px solid ${secondary}">
      <div style="display:flex;align-items:center;gap:16px;justify-content:space-between">
        <div>
          <div style="font-size:27px;font-weight:800;letter-spacing:.2px">${esc(company)}</div>
          <div style="margin-top:5px;font-size:12px;color:#dce9e5">${esc(contact)}</div>
        </div>
        ${b.logo_url ? `<img src="${esc(b.logo_url)}" alt="${esc(company)} logo" style="max-height:58px;max-width:150px;object-fit:contain;background:white;border-radius:10px;padding:8px" />` : `<div style="min-width:68px;height:68px;border:1px solid rgba(255,255,255,.35);border-radius:14px;display:grid;place-items:center;color:${secondary};font-weight:900;letter-spacing:.08em">APAS</div>`}
      </div>
    </header>
    <main style="padding:34px">
    <div style="display:inline-block;border-radius:999px;background:#edf7f2;color:${primary};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;font-weight:800;padding:7px 11px">${n.status === 'issued' ? 'Authorized to proceed' : 'Draft for review'}</div><h1 style="font-size:34px;letter-spacing:-.5px;margin:14px 0 20px;color:#092d25">Notice to Proceed</h1>
    <p style="padding:16px 18px;border:1px solid #dbe6df;background:#f8fbf9"><b>To:</b> ${esc(s.company_name)}<br><b>Project:</b> ${esc(s.project_name)}${s.client_name ? `<br><b>Client:</b> ${esc(s.client_name)}` : ''}<br><b>Reference:</b> NTP-${esc(n.id.slice(0,8).toUpperCase())}<br><b>Issued:</b> ${esc(n.issued_at?.slice(0,10) || 'Pending approval')}</p>
    <p>${n.status === 'issued' ? 'You are authorized to proceed with the work described below under the approved agreement, approved proposal, and project requirements.' : 'This draft will authorize the work described below once all release checks are complete and the notice is issued.'}</p>
    ${block('Approved agreement',`${n.agreement_reference}\nApproved on ${n.agreement_approved_on || 'To be confirmed'}`)}
    ${block('Authorized scope',n.scope_of_work)}
    <table style="width:100%;border-collapse:collapse;background:#f1f6f3"><tr>${[['Start date',n.start_date],['Required completion',n.completion_date],['Authorized budget',noticeMoney(n.budget_cents)]].map(([label,value]) => `<td style="padding:15px;border:1px solid #dbe6df"><div style="font-size:11px;color:#5c7265">${label}</div><b>${esc(value || 'To be confirmed')}</b></td>`).join('')}</tr></table>
    ${n.instructions ? block('Coordination and conditions',n.instructions) : ''}
    <section style="margin:24px 0;padding:16px;border:1px solid #dbe6df;background:#fbfaf5"><h2 style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8a6a15;margin:0 0 8px">Important controls</h2><ul style="margin:0;padding-left:18px;line-height:1.7"><li>Proceed only within the approved scope, schedule, and authorized budget.</li><li>Do not perform changed or additional work without written approval.</li><li>Submit invoices, closeout documents, and supporting backup against the approved proposal or contract line items.</li></ul></section>
    <p style="margin-top:24px">The approved agreement governs the work. This notice starts authorized performance only for the scope and amount stated above.</p>
    <section style="margin-top:34px">
      <div style="font:28px Georgia,serif;color:${primary};line-height:1">/s/ Hardeep Anand, PE</div>
      <div style="margin-top:10px;font-weight:800;color:#092d25">Hardeep Anand, PE</div>
      <div style="font-size:13px;color:#63766d">Authorized Representative | ${esc(company)}</div>
    </section>
    </main>
    <footer style="background:#f3f7f5;border-top:1px solid #dbe6df;padding:16px 34px;color:#63766d;font-size:11px">${esc(b.footer_text || 'Official project authorization issued through APAS Consulting.')} | ${esc(s.project_name)}</footer>
  </article>`;
}
