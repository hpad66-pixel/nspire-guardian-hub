// Branded regulatory letter — letterhead + address block + body + signature.
// Used for print / PDF. Inline styles only.

export interface LetterDocInput {
  brand?: string;
  date?: string | null;
  agency?: string | null;
  recipient?: string | null;
  recipientAddress?: string | null;
  referenceNo?: string | null;
  subject: string;
  body?: string | null;
  signedBy?: string | null;
  projectName?: string | null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtDate = (s?: string | null) =>
  (s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s) : new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export function buildLetterHtml(input: LetterDocInput): string {
  const brand = input.brand || 'APAS AI';
  const paras = (input.body || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const toBlock = [input.recipient, input.agency, input.recipientAddress].filter(Boolean).map((l) => esc(String(l))).join('<br>');

  return `<div style="max-width:680px;margin:0 auto;font-family:'DM Sans',Georgia,serif;color:#1A1714;font-size:14px;line-height:1.6;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C4A35A;padding-bottom:10px;">
      <div style="font-family:Georgia,'Playfair Display',serif;font-size:22px;font-weight:700;">${esc(brand)}</div>
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a877f;">Regulatory correspondence</div>
    </div>

    <div style="margin-top:26px;font-size:13.5px;">${fmtDate(input.date)}</div>
    ${input.referenceNo ? `<div style="margin-top:2px;font-size:12.5px;color:#5f5c57;">Re: ${esc(input.referenceNo)}</div>` : ''}

    ${toBlock ? `<div style="margin-top:18px;font-size:13.5px;">${toBlock}</div>` : ''}

    <div style="margin-top:20px;font-weight:600;">Subject: ${esc(input.subject)}</div>

    <div style="margin-top:16px;">
      ${input.recipient ? `<p style="margin:0 0 12px;">Dear ${esc(input.recipient.split(',')[0])}:</p>` : `<p style="margin:0 0 12px;">To Whom It May Concern:</p>`}
      ${paras || '<p style="color:#8a877f;">[Letter body]</p>'}
    </div>

    <div style="margin-top:24px;">
      <p style="margin:0 0 40px;">Sincerely,</p>
      <div style="border-top:1px solid #cfccc6;width:230px;padding-top:4px;font-size:13px;">${esc(input.signedBy || '')}</div>
      <div style="font-size:12px;color:#5f5c57;">${esc(brand)}${input.projectName ? ` · ${esc(input.projectName)}` : ''}</div>
    </div>
  </div>`;
}
